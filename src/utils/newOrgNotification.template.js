export const newOrgNotificationTemplate = ({
  orgName,
  adminName,
  adminEmail,
  orgCode,
  createdAt,
}) => {
  return `
  <div style="margin:0; padding:0; background:#f3f4f6; font-family:Segoe UI, Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 30px;">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px; border:1px solid #e5e7eb;">
            <tr>
                    <td>
                    <img 
                        src="https://www.jervix.com/assets/logo.png" 
                        alt="Jervix"
                        height="32"
                        style="display:block;"
                    />
                    </td>
                    <td style="padding-left:10px; font-size:18px; font-weight:600; color:#111827;">
                    
                    </td>
                </tr>
            <!-- Header -->
            <tr>
              <td style="padding-bottom:20px;">
                <h2 style="margin:0; font-size:18px; color:#111827;">
                  Jervix — New Organization Registered
                </h2>
              </td>
            </tr>

            <!-- Message -->
            <tr>
              <td style="font-size:14px; color:#374151; padding-bottom:20px;">
                A new organization has been successfully registered on the platform.
              </td>
            </tr>

            <!-- Details Box -->
            <tr>
              <td style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:20px;">
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  
                  <tr>
                    <td style="font-size:13px; color:#6b7280; padding:6px 0;">Organization Name</td>
                    <td style="font-size:13px; color:#111827; font-weight:500;">${orgName}</td>
                  </tr>

                  <tr>
                    <td style="font-size:13px; color:#6b7280; padding:6px 0;">Admin Name</td>
                    <td style="font-size:13px; color:#111827; font-weight:500;">${adminName}</td>
                  </tr>

                  <tr>
                    <td style="font-size:13px; color:#6b7280; padding:6px 0;">Admin Email</td>
                    <td style="font-size:13px; color:#111827; font-weight:500;">${adminEmail}</td>
                  </tr>

                  <tr>
                    <td style="font-size:13px; color:#6b7280; padding:6px 0;">Organization Code</td>
                    <td style="font-size:13px; color:#111827; font-weight:500;">${orgCode}</td>
                  </tr>

                  <tr>
                    <td style="font-size:13px; color:#6b7280; padding:6px 0;">Registered On</td>
                    <td style="font-size:13px; color:#111827; font-weight:500;">${createdAt}</td>
                  </tr>

                </table>

              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding-top:25px;">
                <a href="https://app.jervix.com/admin"
                   style="display:inline-block; padding:10px 18px; background:#111827; color:#ffffff; text-decoration:none; border-radius:6px; font-size:13px;">
                   View in Dashboard
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:30px; font-size:12px; color:#9ca3af;">
                This is an automated system notification from Jervix.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </div>
  `;
};