import { Employee } from "../models/employee.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToCloudinary } from "../utils/cloudinary.util.js";
import cloudinary from "../config/cloudinary.config.js";

// CREATE
export const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, department, designation } = req.body;

  if (!name || !email) {
    throw new ApiError(400, "Name and email are required");
  }

  let profileImage = {};

  // ✅ Handle image upload (if provided)
  if (req.file) {
    console.log("FILE RECEIVED:", req.file);
  console.log("BUFFER SIZE:", req.file?.buffer?.length);
    try {
      const result = await uploadToCloudinary(req.file.buffer);

      profileImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
  console.error("CLOUDINARY ERROR (CREATE):", error); // 👈 ADD THIS
  throw new ApiError(500, error.message || "Image upload failed");
}
  }

  const employee = await Employee.create({
    name,
    email,
    department,
    designation,
    organizationId: req.user.organizationId,
    profileImage, // ✅ new field
  });

  res.status(201).json({
    success: true,
    message: "Employee created",
    data: employee,
  });
});

// UPDATE
export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { name, email, department, designation } = req.body;

  const employee = await Employee.findOne({
    _id: id,
    organizationId: req.user.organizationId,
  });

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // ✅ Handle image update
  if (req.file) {
    
    try {

      // 🔥 delete old image if exists
      if (employee.profileImage?.public_id) {
        await cloudinary.uploader.destroy(employee.profileImage.public_id);
      }

      // 🔥 upload new image
      const result = await uploadToCloudinary(req.file.buffer);

      employee.profileImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
  console.error("CLOUDINARY ERROR (CREATE):", error); // 👈 ADD THIS
  throw new ApiError(500, error.message || "Image upload failed");
}
  }

  // ✅ Update fields (only if provided)
  if (name) employee.name = name;
  if (email) employee.email = email;
  if (department) employee.department = department;
  if (designation) employee.designation = designation;

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
  }).sort({ createdAt: -1 });

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
  });

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
