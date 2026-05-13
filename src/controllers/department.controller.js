import { Department } from "../models/department.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const createDepartment = asyncHandler(async (req, res) => {
    const {name, description} = req.body;

    if(!req.user.organizationId){
        throw new ApiError(400, "Organization not found");
    }

    if(!name || !description){
        throw new ApiError(400, "All fields are required");
    }

    const existing = await Department.findOne({name, organizationId: req.user.organizationId});

    if(existing){
        throw new ApiError(409, "Department already exists");
    }

    const department = await Department.create({
        name,
        description,
        organizationId: req.user.organizationId
    });

    res.status(201).json({success: true, data: department});    
});

export const getDepartments = asyncHandler(async (req, res) => {
    const list = await Department.find({organizationId: req.user.organizationId}).sort({createdAt: -1});

    res.json({success: true, data: list});  
});

export const deleteDepartment = asyncHandler(async (req, res) => {
    const {id} = req.params;

    await Department.findByIdAndDelete(id);

    res.json({success: true});  
});
