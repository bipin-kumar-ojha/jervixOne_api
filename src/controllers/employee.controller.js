import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToCloudinary } from "../utils/cloudinary.util.js";
import cloudinary from "../config/cloudinary.config.js";
import { sendEmail } from "../services/mail.service.js";
import crypto from "crypto";
import mongoose from "mongoose";

const generateTemporaryPassword = () => {
  return crypto.randomBytes(12).toString("base64url");
};

const escapeHtml = (value = "") => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const employeeWelcomeTemplate = ({ name, username, password }) => `
  <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="color: #111827;">Welcome to Jervix One, ${escapeHtml(name)}!</h2>
    <p>Your employee profile has been created and your account is ready.</p>
    <p>You can log in with the credentials below:</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px;"><strong>Username:</strong> ${escapeHtml(username)}</p>
      <p style="margin: 0;"><strong>Password:</strong> ${escapeHtml(password)}</p>
    </div>
    <p>Please keep these credentials secure.</p>
    <p style="margin-top: 24px;">Regards,<br/>Jervix One Team</p>
  </div>
`;

// CREATE
export const createEmployee = asyncHandler(async (req, res) => {
  console.log("Creating employee with data:", req.body);
  // Destructure all fields from req.body
  const {
    name,
    personalEmail,
    officialEmail,
    phone,
    dob,
    gender,
    maritalStatus,
    nationality,
    permanentAddress,
    currentAddress,
    pan,
    aadhaar,
    passport,
    drivingLicense,
    uan,
    employeeId,
    department,
    designation,
    manager,
    dateOfJoining,
    employmentType,
    probationPeriod,
    salary,
    bankName,
    accountNumber,
    ifsc,
    branchName,
    salaryStructure,
    highestQualification,
    university,
    yearOfPassing,
    certifications,
    previousCompany,
    previousDesignation,
    previousDuration,
    lastDrawnSalary,
    reasonForLeaving,
    emergencyContactName,
    emergencyRelationship,
    emergencyPhone,
    emergencyAddress,
    pfDeclaration,
    esiForm,
    professionalTax,
    nomineeDetails,
    role,
    userRole
  } = req.body;

  console.log("Received employee data:", req.body);

  // Basic required fields validation (add more as needed)
  if (!name || !personalEmail || !officialEmail || !dob || !gender || !permanentAddress || !pan || !aadhaar || !dateOfJoining || !employmentType) {
    throw new ApiError(400, "Missing required fields");
  }

  const normalizedOfficialEmail = officialEmail.toLowerCase().trim();
  const normalizedPersonalEmail = personalEmail.toLowerCase().trim();
  const requestedRole = userRole || role;

  const existingUser = await User.findOne({ email: normalizedOfficialEmail });
  if (existingUser) {
    throw new ApiError(409, "A user with this official email already exists");
  }

  let userRoleDoc = null;
  if (requestedRole) {
    if (!mongoose.Types.ObjectId.isValid(requestedRole)) {
      throw new ApiError(400, "Invalid user role selected");
    }

    userRoleDoc = await Role.findById(requestedRole);
    if (!userRoleDoc) {
      throw new ApiError(400, "Invalid user role selected");
    }
  } else {
    userRoleDoc = await Role.findOne({ name: { $regex: /^viewer$/i } });
    if (!userRoleDoc) {
      throw new ApiError(500, "Default employee user role not configured");
    }
  }

  // Validate manager if provided
  let managerExists = null;
  if (manager) {
    managerExists = await Employee.findOne({
      _id: manager,
      organizationId: req.user.organizationId,
    });
    if (!managerExists) {
      throw new ApiError(400, "Manager not found");
    }
  }

  let profileImage = {};
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      profileImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error("CLOUDINARY ERROR (CREATE):", error);
      throw new ApiError(500, error.message || "Image upload failed");
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  let createdUser = null;
  const employee = await Employee.create({
    name,
    personalEmail: normalizedPersonalEmail,
    officialEmail: normalizedOfficialEmail,
    phone,
    dob,
    gender,
    maritalStatus,
    nationality,
    permanentAddress,
    currentAddress,
    pan,
    aadhaar,
    passport,
    drivingLicense,
    uan,
    employeeId,
    department,
    designation,
    manager,
    dateOfJoining,
    employmentType,
    probationPeriod,
    salary,
    bankName,
    accountNumber,
    ifsc,
    branchName,
    salaryStructure,
    highestQualification,
    university,
    yearOfPassing,
    certifications,
    previousCompany,
    previousDesignation,
    previousDuration,
    lastDrawnSalary,
    reasonForLeaving,
    emergencyContactName,
    emergencyRelationship,
    emergencyPhone,
    emergencyAddress,
    pfDeclaration,
    esiForm,
    professionalTax,
    nomineeDetails,
    organizationId: req.user.organizationId,
    profileImage,
  }).catch(async (error) => {
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
    }

    if (profileImage.public_id) {
      await cloudinary.uploader.destroy(profileImage.public_id).catch((cloudinaryError) => {
        console.error("CLOUDINARY CLEANUP ERROR (CREATE):", cloudinaryError);
      });
    }

    throw error;
  });

  try {
    createdUser = await User.create({
      name: name.trim(),
      email: normalizedOfficialEmail,
      password: temporaryPassword,
      role: userRoleDoc._id,
      organizationId: req.user.organizationId,
    });
  } catch (error) {
    await Employee.findByIdAndDelete(employee._id);

    if (profileImage.public_id) {
      await cloudinary.uploader.destroy(profileImage.public_id).catch((cloudinaryError) => {
        console.error("CLOUDINARY CLEANUP ERROR (CREATE):", cloudinaryError);
      });
    }

    throw error;
  }

  sendEmail({
    to: normalizedPersonalEmail,
    subject: "Welcome to Jervix One - Your Account Details",
    html: employeeWelcomeTemplate({
      name,
      username: normalizedOfficialEmail,
      password: temporaryPassword,
    }),
  }).catch((err) => {
    console.error("Employee welcome email failed:", err.message);
  });

  res.status(201).json({
    success: true,
    message: "Employee and user created",
    data: {
      employee,
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: userRoleDoc.name,
      },
      credentialsSentTo: normalizedPersonalEmail,
    },
  });
});

// UPDATE
export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findOne({
    _id: id,
    organizationId: req.user.organizationId,
  });
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Destructure all fields from req.body
  const {
    name,
    personalEmail,
    officialEmail,
    phone,
    dob,
    gender,
    maritalStatus,
    nationality,
    permanentAddress,
    currentAddress,
    pan,
    aadhaar,
    passport,
    drivingLicense,
    uan,
    employeeId,
    department,
    designation,
    manager,
    dateOfJoining,
    employmentType,
    probationPeriod,
    salary,
    bankName,
    accountNumber,
    ifsc,
    branchName,
    salaryStructure,
    highestQualification,
    university,
    yearOfPassing,
    certifications,
    previousCompany,
    previousDesignation,
    previousDuration,
    lastDrawnSalary,
    reasonForLeaving,
    emergencyContactName,
    emergencyRelationship,
    emergencyPhone,
    emergencyAddress,
    pfDeclaration,
    esiForm,
    professionalTax,
    nomineeDetails
  } = req.body;

  // Handle image update
  if (req.file) {
    try {
      if (employee.profileImage?.public_id) {
        await cloudinary.uploader.destroy(employee.profileImage.public_id);
      }
      const result = await uploadToCloudinary(req.file.buffer);
      employee.profileImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error("CLOUDINARY ERROR (UPDATE):", error);
      throw new ApiError(500, error.message || "Image upload failed");
    }
  }

  // Update fields if provided
  if (name) employee.name = name;
  if (personalEmail) employee.personalEmail = personalEmail;
  if (officialEmail) employee.officialEmail = officialEmail;
  if (phone) employee.phone = phone;
  if (dob) employee.dob = dob;
  if (gender) employee.gender = gender;
  if (maritalStatus) employee.maritalStatus = maritalStatus;
  if (nationality) employee.nationality = nationality;
  if (permanentAddress) employee.permanentAddress = permanentAddress;
  if (currentAddress) employee.currentAddress = currentAddress;
  if (pan) employee.pan = pan;
  if (aadhaar) employee.aadhaar = aadhaar;
  if (passport) employee.passport = passport;
  if (drivingLicense) employee.drivingLicense = drivingLicense;
  if (uan) employee.uan = uan;
  if (employeeId) employee.employeeId = employeeId;
  if (department) employee.department = department;
  if (designation) employee.designation = designation;
  if (manager) employee.manager = manager;
  if (dateOfJoining) employee.dateOfJoining = dateOfJoining;
  if (employmentType) employee.employmentType = employmentType;
  if (probationPeriod) employee.probationPeriod = probationPeriod;
  if (salary) employee.salary = salary;
  if (bankName) employee.bankName = bankName;
  if (accountNumber) employee.accountNumber = accountNumber;
  if (ifsc) employee.ifsc = ifsc;
  if (branchName) employee.branchName = branchName;
  if (salaryStructure) employee.salaryStructure = salaryStructure;
  if (highestQualification) employee.highestQualification = highestQualification;
  if (university) employee.university = university;
  if (yearOfPassing) employee.yearOfPassing = yearOfPassing;
  if (certifications) employee.certifications = certifications;
  if (previousCompany) employee.previousCompany = previousCompany;
  if (previousDesignation) employee.previousDesignation = previousDesignation;
  if (previousDuration) employee.previousDuration = previousDuration;
  if (lastDrawnSalary) employee.lastDrawnSalary = lastDrawnSalary;
  if (reasonForLeaving) employee.reasonForLeaving = reasonForLeaving;
  if (emergencyContactName) employee.emergencyContactName = emergencyContactName;
  if (emergencyRelationship) employee.emergencyRelationship = emergencyRelationship;
  if (emergencyPhone) employee.emergencyPhone = emergencyPhone;
  if (emergencyAddress) employee.emergencyAddress = emergencyAddress;
  if (pfDeclaration) employee.pfDeclaration = pfDeclaration;
  if (esiForm) employee.esiForm = esiForm;
  if (professionalTax) employee.professionalTax = professionalTax;
  if (nomineeDetails) employee.nomineeDetails = nomineeDetails;

  await employee.save();

  res.status(200).json({
    success: true,
    message: "Employee updated",
    data: employee,
  });
});

// GET ALL
export const getEmployees = asyncHandler(async (req, res) => {
  console.log("Fetching employees for organization:", req.user.organizationId);
  const employees = await Employee.find({
      organizationId: req.user.organizationId,
    })
    .populate("department", "name")
    .populate("designation", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: employees,
  });
});

//By ID
export const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await Employee.findOne({
    _id: id,
    organizationId: req.user.organizationId,
  })
    .populate("department", "name")
    .populate("designation", "name")
    .populate("manager", "name");

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
});

// DELETE
export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await Employee.findOne({
    _id: id,
    organizationId: req.user.organizationId,
  });

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // ✅ delete image from cloudinary
  if (employee.profileImage?.public_id) {
    await cloudinary.uploader.destroy(employee.profileImage.public_id);
  }

  await employee.deleteOne();

  res.json({
    success: true,
    message: "Employee deleted",
  });
});
