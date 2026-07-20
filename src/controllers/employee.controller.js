import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import Organization from "../models/organization.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToCloudinary } from "../utils/cloudinary.util.js";
import cloudinary from "../config/cloudinary.config.js";
import { sendEmail } from "../services/mail.service.js";
import {
  appendEmployeeCredentials,
  isGoogleSheetsConfigured,
} from "../services/googleSheets.service.js";
import crypto from "crypto";
import mongoose from "mongoose";

const generateTemporaryPassword = () => {
  return crypto.randomBytes(12).toString("base64url");
};

const getRoleId = (role) => {
  if (!role) return null;

  if (Array.isArray(role)) {
    return getRoleId(role[0]);
  }

  if (typeof role === "object") {
    return role._id || role.id || role.value || null;
  }

  const trimmedRole = String(role).trim();

  if (!trimmedRole) return null;

  try {
    const parsedRole = JSON.parse(trimmedRole);
    return getRoleId(parsedRole);
  } catch {
    return trimmedRole;
  }
};

const normalizeOptionalObjectId = (value) => {
  if (value === undefined || value === null) return null;

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const escapeHtml = (value = "") => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getLoginUrl = () => {
  return process.env.APP_LOGIN_URL
    || process.env.FRONTEND_LOGIN_URL
    || process.env.FRONTEND_URL
    || "https://one.jervix.com/login";
};

const employeeWelcomeTemplate = ({ name, organizationName, username, password, loginUrl }) => `
  <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#111827;color:#ffffff;padding:24px 28px;">
          <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#d1d5db;">${escapeHtml(organizationName)}</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;">Your employee account is ready</h1>
        </div>

        <div style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;">Hello ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
            Your account has been created by ${escapeHtml(organizationName)}. Use the credentials below to sign in and access your employee workspace.
          </p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:22px 0;">
            <p style="margin:0 0 10px;font-size:14px;"><strong>Email:</strong> ${escapeHtml(username)}</p>
            <p style="margin:0;font-size:14px;"><strong>Temporary password:</strong> ${escapeHtml(password)}</p>
          </div>

          <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#4b5563;">
            For your security, please sign in and change your password after your first login.
          </p>

          <a href="${escapeHtml(loginUrl)}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:700;">
            Login to your account
          </a>

          <p style="margin:28px 0 0;font-size:15px;line-height:1.7;">
            Regards,<br/>
            ${escapeHtml(organizationName)}
          </p>
        </div>

        <div style="border-top:1px solid #e5e7eb;padding:16px 28px;background:#f9fafb;">
          <p style="margin:0;font-size:12px;color:#6b7280;">Powered by Jervix</p>
        </div>
      </div>
    </div>
  </div>
`;

// CREATE
export const createEmployee = asyncHandler(async (req, res) => {
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
  } = req.body;


  // Basic required fields validation (add more as needed)
  if (!name || !personalEmail || !officialEmail || !dob || !gender || !permanentAddress || !pan || !aadhaar || !dateOfJoining || !employmentType) {
    throw new ApiError(400, "Missing required fields");
  }

  const normalizedOfficialEmail = officialEmail.toLowerCase().trim();
  const normalizedPersonalEmail = personalEmail.toLowerCase().trim();
  const requestedRole = getRoleId(role);
  const departmentId = normalizeOptionalObjectId(department);
  const designationId = normalizeOptionalObjectId(designation);
  const managerId = normalizeOptionalObjectId(manager);

  if (!requestedRole) {
    throw new ApiError(400, "Role is required");
  }

  if (!mongoose.Types.ObjectId.isValid(requestedRole)) {
    throw new ApiError(400, "Invalid role");
  }

  if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
    throw new ApiError(400, "Invalid department");
  }

  if (designationId && !mongoose.Types.ObjectId.isValid(designationId)) {
    throw new ApiError(400, "Invalid designation");
  }

  if (managerId && !mongoose.Types.ObjectId.isValid(managerId)) {
    throw new ApiError(400, "Invalid manager");
  }

  const [organization, existingUser, existingEmployee, roleDoc, managerExists] = await Promise.all([
    Organization.findById(req.user.organizationId).select("name").lean(),
    User.exists({ email: normalizedOfficialEmail }),
    Employee.exists({
      officialEmail: normalizedOfficialEmail,
      organizationId: req.user.organizationId,
    }),
    Role.findOne({
      _id: requestedRole,
      organizationId: req.user.organizationId,
    }).select("_id name").lean(),
    managerId
      ? Employee.exists({ _id: managerId, organizationId: req.user.organizationId })
      : Promise.resolve(null),
  ]);

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  if (existingUser) {
    throw new ApiError(409, "A user with this official email already exists");
  }

  if (existingEmployee) {
    throw new ApiError(409, "An employee with this official email already exists");
  }

  if (!roleDoc) {
    throw new ApiError(404, "Role not found");
  }

  if (managerId && !managerExists) {
    throw new ApiError(400, "Manager not found");
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
    department: departmentId,
    designation: designationId,
    manager: managerId,
    role: roleDoc._id,
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

  const populatedEmployee = await employee.populate("role", "_id name");

  try {
    createdUser = await User.create({
      name: name.trim(),
      email: normalizedOfficialEmail,
      password: temporaryPassword,
      role: roleDoc._id,
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

  let emailStatus = {
    sent: false,
    to: normalizedOfficialEmail,
  };

  const sheetStatus = {
    saved: false,
    configured: isGoogleSheetsConfigured(),
  };

  const sheetPromise = sheetStatus.configured
    ? appendEmployeeCredentials({
        organizationName: organization.name,
        employeeId,
        employeeName: name.trim(),
        username: normalizedOfficialEmail,
        temporaryPassword,
        roleName: roleDoc.name,
      })
    : Promise.resolve();

  const emailPromise = sendEmail({
      to: normalizedOfficialEmail,
      fromName: organization.name,
      subject: `${organization.name} - Your employee account details`,
      html: employeeWelcomeTemplate({
        name,
        organizationName: organization.name,
        username: normalizedOfficialEmail,
        password: temporaryPassword,
        loginUrl: getLoginUrl(),
      }),
    });

  const [sheetResult, emailResult] = await Promise.allSettled([
    sheetPromise,
    emailPromise,
  ]);

  if (!sheetStatus.configured) {
    sheetStatus.error = "Google Sheets credential storage is not configured";
  } else if (sheetResult.status === "fulfilled") {
    sheetStatus.saved = true;
  } else {
    console.error("Employee credential Google Sheets save failed:", sheetResult.reason?.message);
    sheetStatus.error = sheetResult.reason?.message;
  }

  if (emailResult.status === "fulfilled") {
    emailStatus.sent = true;
  } else {
    const err = emailResult.reason;
    console.error("Employee welcome email failed:", err.response?.body || err.message);
    emailStatus.error = err.response?.body?.errors?.[0]?.message || err.message;
  }

  res.status(201).json({
    success: true,
    message: emailStatus.sent && sheetStatus.saved
      ? "Employee and user created. Welcome email sent and credentials saved to Google Sheets."
      : emailStatus.sent
        ? "Employee and user created. Welcome email sent; Google Sheets credential save failed."
        : sheetStatus.saved
          ? "Employee and user created. Welcome email failed; credentials saved to Google Sheets."
          : "Employee and user created. Welcome email and Google Sheets credential save failed.",
    data: {
      employee: populatedEmployee,
      account: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: roleDoc.name,
        credentialsSentTo: emailStatus.sent ? normalizedOfficialEmail : null,
        emailStatus,
        sheetStatus,
      },
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

  const departmentId = normalizeOptionalObjectId(department);
  const designationId = normalizeOptionalObjectId(designation);
  const managerId = normalizeOptionalObjectId(manager);

  if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
    throw new ApiError(400, "Invalid department");
  }

  if (designationId && !mongoose.Types.ObjectId.isValid(designationId)) {
    throw new ApiError(400, "Invalid designation");
  }

  if (managerId && !mongoose.Types.ObjectId.isValid(managerId)) {
    throw new ApiError(400, "Invalid manager");
  }

  if (managerId) {
    const managerExists = await Employee.exists({
      _id: managerId,
      organizationId: req.user.organizationId,
    });

    if (!managerExists) {
      throw new ApiError(400, "Manager not found");
    }
  }

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
  if (department !== undefined) employee.department = departmentId;
  if (designation !== undefined) employee.designation = designationId;
  if (manager !== undefined) employee.manager = managerId;
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
  const employeeRows = await Employee.find({
      organizationId: req.user.organizationId,
    })
    .populate("department", "name")
    .populate("designation", "name")
    .populate("role", "_id name")
    .sort({ createdAt: -1 })
    .lean();

  const employeesByEmail = new Map();

  for (const employee of employeeRows) {
    const emailKey = employee.officialEmail?.toLowerCase();

    if (!emailKey || !employeesByEmail.has(emailKey)) {
      employeesByEmail.set(emailKey || employee._id.toString(), employee);
    }
  }

  res.status(200).json({
    success: true,
    data: [...employeesByEmail.values()],
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
    .populate("role", "_id name")
    .populate("manager", "name")
    .lean();

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
