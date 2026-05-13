import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    // 1. Basic Details
    name: { type: String, required: true, trim: true },
    personalEmail: { type: String, required: true, lowercase: true, trim: true },
    officialEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    dob: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    maritalStatus: { type: String, enum: ["single", "married", "divorced", "widowed"] },
    nationality: { type: String, trim: true },

    // 2. Address
    permanentAddress: { type: String, required: true },
    currentAddress: { type: String },

    // 3. Legal & Payroll Compliance
    pan: { type: String, required: true, trim: true },
    aadhaar: { type: String, required: true, trim: true },
    passport: { type: String, trim: true },
    drivingLicense: { type: String, trim: true },
    uan: { type: String, trim: true },
    employeeId: { type: String, trim: true },

    // 4. Job Details
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    dateOfJoining: { type: String, required: true },
    employmentType: { type: String, enum: ["full-time", "contract", "intern"], required: true },
    probationPeriod: { type: Number },

    // 5. Salary & Bank Details
    salary: { type: Number, default: 0 },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    branchName: { type: String, trim: true },
    salaryStructure: { type: String },

    // 6. Educational Details
    highestQualification: { type: String, trim: true },
    university: { type: String, trim: true },
    yearOfPassing: { type: Number },
    certifications: { type: String },

    // 7. Previous Employment Details
    previousCompany: { type: String, trim: true },
    previousDesignation: { type: String, trim: true },
    previousDuration: { type: String, trim: true },
    lastDrawnSalary: { type: Number },
    reasonForLeaving: { type: String },

    // 8. Emergency Contact Information
    emergencyContactName: { type: String, trim: true },
    emergencyRelationship: { type: String, trim: true },
    emergencyPhone: { type: String, trim: true },
    emergencyAddress: { type: String },

    // 9. Statutory & Compliance Forms (India)
    pfDeclaration: { type: String, trim: true },
    esiForm: { type: String, trim: true },
    professionalTax: { type: String, trim: true },
    nomineeDetails: { type: String },

    // 10. Profile Image
    profileImage: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    // Organization & Status
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export const Employee = mongoose.model("Employee", employeeSchema);
