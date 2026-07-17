import mongoose from "mongoose";
import CandidateLead from "../models/candidateLead.model.js";
import ProductLead from "../models/productLead.model.js";
import WebsiteLead from "../models/websiteLead.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../services/mail.service.js";

const LEAD_STATUSES = ["new", "contacted", "converted", "closed"];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CAREER_LEAD_TYPE = "career";
const CLIENT_LEAD_TYPE = "client";
const PRODUCT_LEAD_TYPE = "product";
const CAREER_ROLES = [
  "Internship Program",
  "Business Development Executive Intern",
  "Full Stack Developer Intern",
  "Blockchain Developer Intern",
  "Solidity Developer Intern",
  "UI/UX Designer Intern",
  "Social Media Marketing Intern",
  "HR Intern",
  "Account Intern",
];
const PRODUCT_ENQUIRY_TYPES = [
  "Jervix One demo",
  "Jervix One pricing",
  "Jervix One implementation",
  "Jervix One feature fit",
  "Custom product requirement",
];
const ORGANIZATION_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
  "Not sure yet",
];

const escapeHtml = (value = "") => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getDemoEnquiryRecipient = () => {
  return process.env.DEMO_ENQUIRY_EMAIL
    || process.env.WEBSITE_LEAD_EMAIL
    || "info@jervix.com";
};

const getCareerEnquiryRecipient = () => {
  return process.env.CAREER_ENQUIRY_EMAIL
    || process.env.WEBSITE_CAREER_LEAD_EMAIL
    || getDemoEnquiryRecipient();
};

const getProductEnquiryRecipient = () => {
  return process.env.PRODUCT_ENQUIRY_EMAIL
    || process.env.WEBSITE_PRODUCT_LEAD_EMAIL
    || getDemoEnquiryRecipient();
};

const getLeadEmailRecipient = (leadType) => {
  if (leadType === CAREER_LEAD_TYPE) return getCareerEnquiryRecipient();
  if (leadType === PRODUCT_LEAD_TYPE) return getProductEnquiryRecipient();

  return getDemoEnquiryRecipient();
};

const buildTableRows = (rows) => rows
  .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
  .map(([label, value]) => `
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;vertical-align:top;">${escapeHtml(label)}</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;white-space:pre-line;">${escapeHtml(value)}</td>
                  </tr>
  `)
  .join("");

const websiteLeadNotificationTemplate = ({
  leadType,
  organizationName,
  name,
  email,
  phone,
  employeeSize,
  serviceInterest,
  projectBrief,
  careerDetails,
  productName,
  productDetails,
  createdAt,
}) => {
  const isCareerLead = leadType === CAREER_LEAD_TYPE;
  const isProductLead = leadType === PRODUCT_LEAD_TYPE;
  const heading = isCareerLead
    ? "New Career Enquiry"
    : isProductLead
      ? "New Jervix One Product Enquiry"
      : "New Website Lead / Service Consultation";
  const intro = isCareerLead
    ? "A new career enquiry has been submitted from the website."
    : isProductLead
      ? "A new Jervix One product enquiry has been submitted from the website."
      : "A new service consultation enquiry has been submitted from the website.";
  const rows = isCareerLead
    ? [
      ["Candidate Name", name],
      ["Email", email],
      ["Phone", phone],
      ["Selected Role", careerDetails?.role || serviceInterest],
      ["Current Status", careerDetails?.currentStatus],
      ["Resume / Portfolio Link", careerDetails?.portfolio],
      ["Skills / Tools", careerDetails?.skills],
      ["Message", careerDetails?.message || projectBrief],
      ["Submitted On", createdAt],
    ]
    : isProductLead
      ? [
        ["Product Name", productName || productDetails?.productName],
        ["Enquiry Type", productDetails?.enquiryType],
        ["Organization Name", organizationName],
        ["Organization Size", productDetails?.organizationSize],
        ["Contact Name", name],
        ["Email", email],
        ["Phone", phone],
        ["Expected Timeline", productDetails?.timeline],
        ["Product Requirement", productDetails?.requirement],
        ["Submitted On", createdAt],
      ]
    : [
      ["Organization Name", organizationName],
      ["Name", name],
      ["Email", email],
      ["Phone", phone],
      ["Service Interest", serviceInterest],
      ["Project Brief", projectBrief],
      ["Employee Size", employeeSize],
      ["Submitted On", createdAt],
    ];

  return `
    <div style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif;color:#111827;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:30px;">
              <tr>
                <td style="padding-bottom:20px;">
                  <h2 style="margin:0;font-size:20px;color:#111827;">${escapeHtml(heading)}</h2>
                </td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#374151;padding-bottom:20px;">
                  ${escapeHtml(intro)}
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${buildTableRows(rows)}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-top:28px;font-size:12px;color:#9ca3af;">
                  This is an automated website notification from Jervix.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
};

const ensureObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid website lead ID");
  }
};

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const requestedLimit = Math.max(Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE, 1);
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const normalizeLeadPayload = (body) => {
  const leadType = [CAREER_LEAD_TYPE, PRODUCT_LEAD_TYPE].includes(body.leadType)
    ? body.leadType
    : CLIENT_LEAD_TYPE;
  const organizationName = body.organizationName || body.organisationName || body.companyName;
  const name = body.name || body.yourName;
  const employeeSize = body.employeeSize || body.employeeSizes || body.employeeeSizes;
  const serviceInterest = body.serviceInterest || body.role;
  const projectBrief = body.projectBrief;
  const careerDetails = leadType === CAREER_LEAD_TYPE
    ? normalizeCareerDetails(body, serviceInterest, projectBrief)
    : undefined;
  const productDetails = leadType === PRODUCT_LEAD_TYPE
    ? normalizeProductDetails(body, serviceInterest, projectBrief)
    : undefined;

  return {
    leadType,
    productName: body.productName?.trim(),
    organizationName: (organizationName || (leadType === CAREER_LEAD_TYPE ? "Career Enquiry" : ""))?.trim(),
    name: name?.trim(),
    email: body.email?.trim()?.toLowerCase(),
    phone: body.phone?.trim(),
    employeeSize: employeeSize?.trim(),
    serviceInterest: serviceInterest?.trim(),
    projectBrief: projectBrief?.trim(),
    careerDetails,
    productDetails,
  };
};

const normalizeLabel = (value = "") => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "");

const parseCareerProjectBrief = (projectBrief) => {
  if (!projectBrief) return {};

  const labelMap = {
    careerrole: "role",
    role: "role",
    currentstatus: "currentStatus",
    status: "currentStatus",
    portfolioresumelink: "portfolio",
    resumeportfoliolink: "portfolio",
    portfolio: "portfolio",
    resumelink: "portfolio",
    "skills/tools": "skills",
    skillstools: "skills",
    skills: "skills",
    message: "message",
  };

  return String(projectBrief)
    .split(/\r?\n/)
    .reduce((details, line) => {
      const match = line.match(/^\s*([^:]+):\s*(.*)\s*$/);
      if (!match) return details;

      const key = labelMap[normalizeLabel(match[1])];
      if (key && match[2]) {
        details[key] = match[2].trim();
      }

      return details;
    }, {});
};

const parseProductProjectBrief = (projectBrief) => {
  if (!projectBrief) return {};

  const labelMap = {
    product: "productName",
    enquirytype: "enquiryType",
    inquirytype: "enquiryType",
    organizationsize: "organizationSize",
    organisationsize: "organizationSize",
    timeline: "timeline",
    expectedtimeline: "timeline",
    requirement: "requirement",
    productrequirement: "requirement",
    message: "requirement",
  };

  return String(projectBrief)
    .split(/\r?\n/)
    .reduce((details, line) => {
      const match = line.match(/^\s*([^:]+):\s*(.*)\s*$/);
      if (!match) return details;

      const key = labelMap[normalizeLabel(match[1])];
      if (key && match[2]) {
        details[key] = match[2].trim();
      }

      return details;
    }, {});
};

const getProductEnquiryTypeFromServiceInterest = (serviceInterest) => {
  if (!serviceInterest) return undefined;

  const normalizedServiceInterest = serviceInterest.trim();
  return PRODUCT_ENQUIRY_TYPES.find((type) => normalizedServiceInterest.endsWith(type));
};

const normalizeProductDetails = (body, serviceInterest, projectBrief) => {
  const parsedDetails = parseProductProjectBrief(projectBrief);

  return {
    productName: (body.productName || parsedDetails.productName)?.trim(),
    enquiryType: (body.enquiryType || parsedDetails.enquiryType || getProductEnquiryTypeFromServiceInterest(serviceInterest))?.trim(),
    organizationSize: (body.organizationSize || body.organisationSize || parsedDetails.organizationSize)?.trim(),
    timeline: (body.timeline || parsedDetails.timeline)?.trim(),
    requirement: (body.requirement || body.message || parsedDetails.requirement)?.trim(),
  };
};

const normalizeCareerDetails = (body, serviceInterest, projectBrief) => {
  const parsedDetails = parseCareerProjectBrief(projectBrief);

  return {
    role: (body.role || serviceInterest || parsedDetails.role)?.trim(),
    currentStatus: (body.currentStatus || parsedDetails.currentStatus)?.trim(),
    portfolio: (body.portfolio || parsedDetails.portfolio)?.trim(),
    skills: (body.skills || parsedDetails.skills)?.trim(),
    message: (body.message || parsedDetails.message)?.trim(),
  };
};

const getMissingRequiredFields = (payload) => {
  if (payload.leadType === CAREER_LEAD_TYPE) {
    return [
      ["name", payload.name],
      ["email", payload.email],
      ["phone", payload.phone],
      ["serviceInterest", payload.serviceInterest],
      ["projectBrief", payload.projectBrief],
    ]
      .filter(([, value]) => !value)
      .map(([field]) => field);
  }

  if (payload.leadType === PRODUCT_LEAD_TYPE) {
    return [
      ["leadType", payload.leadType],
      ["productName", payload.productName],
      ["organizationName", payload.organizationName],
      ["name", payload.name],
      ["email", payload.email],
      ["phone", payload.phone],
      ["serviceInterest", payload.serviceInterest],
      ["projectBrief", payload.projectBrief],
    ]
      .filter(([, value]) => !value)
      .map(([field]) => field);
  }

  const hasNewClientFields = payload.serviceInterest && payload.projectBrief;
  const hasLegacyClientFields = payload.employeeSize;
  const shouldRequireNewClientFields = !hasLegacyClientFields;

  return [
    ["organizationName", payload.organizationName],
    ["name", payload.name],
    ["email", payload.email],
    ["phone", payload.phone],
    ["serviceInterest", !shouldRequireNewClientFields || payload.serviceInterest],
    ["projectBrief", !shouldRequireNewClientFields || payload.projectBrief],
  ]
    .filter(([, value]) => !value)
    .map(([field]) => field);
};

const getLeadEmailSubject = (payload) => {
  if (payload.leadType === CAREER_LEAD_TYPE) {
    return `New Career Enquiry - ${payload.serviceInterest}`;
  }

  if (payload.leadType === PRODUCT_LEAD_TYPE) {
    return `New Jervix One Product Enquiry - ${payload.organizationName}`;
  }

  return "New Website Lead / Service Consultation";
};

const getClientLeadPayload = (payload) => ({
  organizationName: payload.organizationName,
  name: payload.name,
  email: payload.email,
  phone: payload.phone,
  employeeSize: payload.employeeSize,
  serviceInterest: payload.serviceInterest,
  projectBrief: payload.projectBrief,
});

const getCandidateLeadPayload = (payload) => ({
  name: payload.name,
  email: payload.email,
  phone: payload.phone,
  role: payload.careerDetails?.role || payload.serviceInterest,
  currentStatus: payload.careerDetails?.currentStatus,
  portfolio: payload.careerDetails?.portfolio,
  skills: payload.careerDetails?.skills,
  message: payload.careerDetails?.message,
  projectBrief: payload.projectBrief,
});

const getProductLeadPayload = (payload) => ({
  productName: payload.productName,
  enquiryType: payload.productDetails?.enquiryType,
  organizationName: payload.organizationName,
  organizationSize: payload.productDetails?.organizationSize,
  name: payload.name,
  email: payload.email,
  phone: payload.phone,
  timeline: payload.productDetails?.timeline,
  requirement: payload.productDetails?.requirement,
  serviceInterest: payload.serviceInterest,
  projectBrief: payload.projectBrief,
});

const buildLeadFilters = (query) => {
  const filters = {};

  if (query.status) {
    if (!LEAD_STATUSES.includes(query.status)) {
      throw new ApiError(400, "Invalid lead status");
    }

    filters.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    filters.$or = [
      { organizationName: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  return filters;
};

export const createWebsiteLead = asyncHandler(async (req, res) => {
  const payload = normalizeLeadPayload(req.body);
  const missingFields = getMissingRequiredFields(payload);

  if (missingFields.length > 0) {
    throw new ApiError(400, `${missingFields.join(", ")} ${missingFields.length === 1 ? "is" : "are"} required`);
  }

  if (
    payload.leadType === CAREER_LEAD_TYPE
    && payload.serviceInterest
    && !CAREER_ROLES.includes(payload.serviceInterest)
  ) {
    throw new ApiError(400, "Invalid career role");
  }

  if (
    payload.leadType === PRODUCT_LEAD_TYPE
    && !payload.productDetails?.enquiryType
  ) {
    throw new ApiError(400, "Enquiry type is required");
  }

  if (
    payload.leadType === PRODUCT_LEAD_TYPE
    && payload.productDetails?.enquiryType
    && !PRODUCT_ENQUIRY_TYPES.includes(payload.productDetails.enquiryType)
  ) {
    throw new ApiError(400, "Invalid product enquiry type");
  }

  if (
    payload.leadType === PRODUCT_LEAD_TYPE
    && payload.productDetails?.organizationSize
    && !ORGANIZATION_SIZES.includes(payload.productDetails.organizationSize)
  ) {
    throw new ApiError(400, "Invalid organization size");
  }

  if (payload.leadType === CAREER_LEAD_TYPE) {
    await CandidateLead.create(getCandidateLeadPayload(payload));
  } else if (payload.leadType === PRODUCT_LEAD_TYPE) {
    await ProductLead.create(getProductLeadPayload(payload));
  } else {
    await WebsiteLead.create(getClientLeadPayload(payload));
  }
  const emailStatus = {
    sent: false,
    to: getLeadEmailRecipient(payload.leadType),
  };

  try {
    await sendEmail({
      to: emailStatus.to,
      fromName: "Jervix Website",
      replyTo: payload.email,
      subject: getLeadEmailSubject(payload),
      html: websiteLeadNotificationTemplate({
        ...payload,
        createdAt: new Date().toLocaleString(),
      }),
    });

    emailStatus.sent = true;
  } catch (err) {
    console.error("Website lead notification email failed:", err.response?.body || err.message);
    emailStatus.error = err.response?.body?.errors?.[0]?.message || err.message;
  }

  const successMessage = payload.leadType === CAREER_LEAD_TYPE
    ? "Career enquiry submitted successfully."
    : payload.leadType === PRODUCT_LEAD_TYPE
      ? "Product enquiry submitted successfully"
    : "Website lead submitted successfully.";

  res.status(201).json({
    message: emailStatus.sent
      ? successMessage
      : `${successMessage} Notification email failed.`,
  });
});

export const getWebsiteLeads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filters = buildLeadFilters(req.query);

  const [websiteLeads, total] = await Promise.all([
    WebsiteLead.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WebsiteLead.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    data: websiteLeads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getWebsiteLeadById = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const websiteLead = await WebsiteLead.findById(req.params.id);

  if (!websiteLead) {
    throw new ApiError(404, "Website lead not found");
  }

  res.status(200).json({ success: true, data: websiteLead });
});

export const updateWebsiteLead = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const updates = {};
  const payload = normalizeLeadPayload(req.body);
  const bodyHasAny = (...fields) => fields.some((field) => req.body[field] !== undefined);

  const updateFieldMap = [
    ["organizationName", ["organizationName", "organisationName", "companyName"]],
    ["name", ["name", "yourName"]],
    ["email", ["email"]],
    ["phone", ["phone"]],
    ["employeeSize", ["employeeSize", "employeeSizes", "employeeeSizes"]],
    ["serviceInterest", ["serviceInterest", "role"]],
    ["projectBrief", ["projectBrief"]],
  ];

  for (const [field, bodyFields] of updateFieldMap) {
    if (bodyHasAny(...bodyFields) && payload[field]) updates[field] = payload[field];
  }

  if (req.body.status !== undefined) {
    if (!LEAD_STATUSES.includes(req.body.status)) {
      throw new ApiError(400, "Invalid lead status");
    }

    updates.status = req.body.status;
  }

  const websiteLead = await WebsiteLead.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true },
  );

  if (!websiteLead) {
    throw new ApiError(404, "Website lead not found");
  }

  res.status(200).json({ success: true, data: websiteLead });
});

export const deleteWebsiteLead = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const websiteLead = await WebsiteLead.findByIdAndDelete(req.params.id);

  if (!websiteLead) {
    throw new ApiError(404, "Website lead not found");
  }

  res.status(200).json({
    success: true,
    message: "Website lead deleted successfully",
  });
});
