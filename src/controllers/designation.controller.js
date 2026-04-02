import { Designation } from "../models/designation.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

/* CREATE */
export const createDesignation = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!req.user.organizationId) {
    throw new ApiError(400, "Organization not found");
  }

  const existing = await Designation.findOne({
    name,
    organizationId: req.user.organizationId,
  });

  if (existing) {
    throw new ApiError(409, "Designation already exists");
  }

  const designation = await Designation.create({
    name,
    description,
    organizationId: req.user.organizationId,
  });

  res.status(201).json({ success: true, data: designation });
});

/* GET ALL */
export const getDesignations = asyncHandler(async (req, res) => {
  const list = await Designation.find({
    organizationId: req.user.organizationId,
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: list });
});

/* DELETE */
export const deleteDesignation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Designation.findByIdAndDelete(id);

  res.json({ success: true });
});