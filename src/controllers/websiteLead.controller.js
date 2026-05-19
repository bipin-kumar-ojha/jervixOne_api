import mongoose from "mongoose";
import WebsiteLead from "../models/websiteLead.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../services/mail.service.js";

const LEAD_STATUSES = ["new", "contacted", "converted", "closed"];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

const websiteLeadNotificationTemplate = ({
  organizationName,
  name,
  email,
  phone,
  employeeSize,
  createdAt,
}) => `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:30px;">
            <tr>
              <td style="padding-bottom:20px;">
                <h2 style="margin:0;font-size:20px;color:#111827;">New Demo Enquiry</h2>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#374151;padding-bottom:20px;">
                A new demo enquiry has been submitted from the website.
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;">Organization Name</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;">${escapeHtml(organizationName)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;">Name</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;">${escapeHtml(name)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;">Email</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;">${escapeHtml(email)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;">Phone</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;">${escapeHtml(phone)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;">Employee Size</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;">${escapeHtml(employeeSize)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding:7px 0;">Submitted On</td>
                    <td style="font-size:13px;color:#111827;font-weight:600;padding:7px 0;">${escapeHtml(createdAt)}</td>
                  </tr>
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
  const organizationName = body.organizationName || body.organisationName || body.companyName;
  const name = body.name || body.yourName;
  const employeeSize = body.employeeSize || body.employeeSizes || body.employeeeSizes;

  return {
    organizationName: organizationName?.trim(),
    name: name?.trim(),
    email: body.email?.trim()?.toLowerCase(),
    phone: body.phone?.trim(),
    employeeSize: employeeSize?.trim(),
  };
};

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

  if (
    !payload.organizationName
    || !payload.name
    || !payload.email
    || !payload.phone
    || !payload.employeeSize
  ) {
    throw new ApiError(400, "Organization name, name, email, phone, and employee size are required");
  }

  const websiteLead = await WebsiteLead.create(payload);
  const emailStatus = {
    sent: false,
    to: getDemoEnquiryRecipient(),
  };

  try {
    await sendEmail({
      to: emailStatus.to,
      fromName: "Jervix Website",
      replyTo: payload.email,
      subject: `New Demo Enquiry - ${payload.organizationName}`,
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

  res.status(201).json({
    success: true,
    message: emailStatus.sent
      ? "Website lead submitted successfully. Notification email sent."
      : "Website lead submitted successfully. Notification email failed.",
    data: {
      websiteLead,
      emailStatus,
    },
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

  for (const field of ["organizationName", "name", "email", "phone", "employeeSize"]) {
    if (payload[field]) {
      updates[field] = payload[field];
    }
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
