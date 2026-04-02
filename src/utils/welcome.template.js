export const welcomeTemplate = ({ name, orgName }) => {
  return `
  <div style="margin:0; padding:0; background-color:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; padding:40px; box-shadow:0 4px 20px rgba(0,0,0,0.05);">
            
            <!-- Logo / Brand -->
            <tr>
            <td style="text-align:left; padding-bottom:20px;">
                <table cellpadding="0" cellspacing="0">
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
                </table>
            </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding-bottom:20px;">
                <h1 style="margin:0; font-size:24px; color:#111827; font-weight:600;">
                  Welcome to Jervix One 
                </h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding-bottom:16px; color:#374151; font-size:15px;">
                Hi <strong>${name}</strong>,
              </td>
            </tr>

            <!-- Main Message -->
            <tr>
              <td style="padding-bottom:16px; color:#374151; font-size:15px; line-height:1.6;">
                Thank you for registering your organization <strong>${orgName}</strong> with <strong>Jervix</strong>.
              </td>
            </tr>

            <tr>
              <td style="padding-bottom:16px; color:#374151; font-size:15px; line-height:1.6;">
                We’re excited to have you onboard. Your workspace has been successfully created and is currently under review by our team to ensure a secure and reliable experience.
              </td>
            </tr>

            <tr>
              <td style="padding-bottom:16px; color:#374151; font-size:15px; line-height:1.6;">
                Once your organization is verified, you will receive an <strong>activation key</strong> via email. You can use this key after logging in to unlock full access and start exploring the Jervix One platform.
              </td>
            </tr>

            <!-- Highlight Box -->
            <tr>
              <td style="padding:16px; background:#f9fafb; border-radius:8px; margin-top:10px;">
                <p style="margin:0; font-size:14px; color:#111827;">
                  🔐 Your data security and platform integrity are our top priorities.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding-top:30px; text-align:left;">
                <a href="https://one.jervix.com" 
                   style="display:inline-block; padding:12px 22px; background:#4F46E5; color:#ffffff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:500;">
                   Go to Jervix One
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:40px; border-top:1px solid #e5e7eb; font-size:12px; color:#9CA3AF; line-height:1.6;">
                <p style="margin:0;">
                  This email was sent to you because you registered on Jervix.
                </p>
                <p style="margin:5px 0 0;">
                  © 2026 Jervix. All rights reserved.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </div>
  `;
};