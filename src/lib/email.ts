import nodemailer from 'nodemailer'
import { APP_NAME, APP_URL } from './constants'

// Create Gmail transporter with App Password
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const transporter = createTransporter()

    if (!transporter) {
      console.warn('Email not configured - skipping email send to:', to)
      return { success: false, reason: 'Email not configured' }
    }

    await transporter.sendMail({
      from: `${APP_NAME} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, reason: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Email wrapper template
function emailWrapper(content: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626;">
        <h1 style="color: #dc2626; margin: 0; font-size: 28px;">⚔️ ${APP_NAME}</h1>
        <p style="color: #666; margin-top: 5px; font-size: 14px;">Martial Arts School Management</p>
      </div>

      ${content}

      <div style="text-align: center; color: #9ca3af; font-size: 12px; padding-top: 20px; margin-top: 30px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;">© 2026 ${APP_NAME}. All rights reserved.</p>
        <p style="margin: 5px 0;">Empowering Martial Arts Schools Worldwide</p>
      </div>
    </div>
  `
}

// Waitlist Email Templates
export function getWaitlistApprovalEmail(name: string, schoolName: string, email?: string) {
  const signupUrl = `${APP_URL}/signup/owner?approved=true&school=${encodeURIComponent(schoolName)}${email ? `&email=${encodeURIComponent(email)}` : ''}`

  const content = `
    <div style="background: #f0fdf4; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
      <h2 style="color: #166534; margin-top: 0;">🎉 Congratulations, ${name}!</h2>
      <p style="color: #374151; line-height: 1.6;">
        Great news! Your application for <strong>${schoolName}</strong> has been <span style="color: #22c55e; font-weight: bold;">approved</span>.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        You can now set up your martial arts school on our platform and start managing your students, classes, events, and more!
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${signupUrl}"
           style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Set Up Your School Now
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${signupUrl}" style="color: #dc2626; word-break: break-all;">${signupUrl}</a>
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
      <h3 style="color: #111; margin-top: 0; font-size: 16px;">What's Next?</h3>
      <ol style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Click the button above to complete your registration</li>
        <li>Set up your school profile and branding</li>
        <li>Add your classes and belt rank system</li>
        <li>Start inviting students and parents!</li>
      </ol>
    </div>

    <p style="color: #6b7280; margin-top: 20px; font-size: 14px;">
      If you have any questions, simply reply to this email and we'll be happy to help!
    </p>
  `

  return {
    subject: `🎉 Your Application Has Been Approved - ${APP_NAME}`,
    html: emailWrapper(content),
  }
}

export function getWaitlistRejectionEmail(name: string, schoolName: string) {
  const content = `
    <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
      <h2 style="color: #111; margin-top: 0;">Hello ${name},</h2>
      <p style="color: #374151; line-height: 1.6;">
        Thank you for your interest in ${APP_NAME} for <strong>${schoolName}</strong>.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        After careful review of your application, we're unable to proceed at this time. This could be due to:
      </p>
      <ul style="color: #374151; line-height: 1.8; margin: 15px 0;">
        <li>Incomplete information provided</li>
        <li>We're currently at capacity in your region</li>
        <li>The application didn't meet our current requirements</li>
      </ul>
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>💡 What can you do?</strong><br>
        If you believe this decision was made in error or have additional information to share, please reply to this email. We review appeals and would be happy to reconsider your application.
      </p>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      We appreciate your interest in ${APP_NAME} and wish you the best with your martial arts journey.
    </p>
  `

  return {
    subject: `Update on Your ${APP_NAME} Application`,
    html: emailWrapper(content),
  }
}

// Member Approval Email Templates
export function getApprovalEmail(userName: string, schoolName: string) {
  const content = `
    <div style="background: #f0fdf4; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
      <h2 style="color: #166534; margin-top: 0;">Welcome to ${schoolName}! 🥋</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${userName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Great news! Your account has been <span style="color: #22c55e; font-weight: bold;">approved</span>. You now have full access to the school's platform.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/login"
           style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Log In Now
        </a>
      </div>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
      <h3 style="color: #111; margin-top: 0; font-size: 16px;">What You Can Do:</h3>
      <ul style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>View class schedules and register for classes</li>
        <li>Track your attendance and belt progress</li>
        <li>Stay updated with school announcements</li>
        <li>Connect with other members in the feed</li>
      </ul>
    </div>

    <p style="color: #6b7280; margin-top: 20px; font-size: 14px;">
      Welcome to the ${APP_NAME} community! Train hard! 💪
    </p>
  `

  return {
    subject: `✅ Welcome to ${schoolName}!`,
    html: emailWrapper(content),
  }
}

export function getDenialEmail(userName: string, schoolName: string) {
  const content = `
    <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
      <h2 style="color: #111; margin-top: 0;">Account Update</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${userName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Unfortunately, your account request for <strong>${schoolName}</strong> was not approved at this time.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        If you believe this was a mistake, please contact the school directly for more information.
      </p>
    </div>
  `

  return {
    subject: `${schoolName} - Account Update`,
    html: emailWrapper(content),
  }
}

export function getPasswordResetEmail(userName: string, resetLink: string) {
  const content = `
    <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
      <h2 style="color: #111; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${userName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}"
           style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
      </p>
    </div>

    <div style="background: #fee2e2; border-radius: 8px; padding: 15px;">
      <p style="color: #991b1b; margin: 0; font-size: 13px;">
        <strong>⚠️ Security Notice:</strong> This link expires in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you're concerned.
      </p>
    </div>
  `

  return {
    subject: `Reset Your ${APP_NAME} Password`,
    html: emailWrapper(content),
  }
}

export function getBeltPromotionEmail(
  studentName: string,
  schoolName: string,
  newBelt: string
) {
  const content = `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; text-align: center;">
      <h2 style="color: #92400e; margin-top: 0; font-size: 24px;">🏆 Congratulations!</h2>
      <p style="color: #374151; font-size: 18px; margin: 20px 0;">
        <strong>${studentName}</strong>
      </p>
      <p style="color: #374151; line-height: 1.6;">
        You have been promoted to
      </p>
      <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
        <span style="font-size: 28px; font-weight: bold; color: #dc2626;">${newBelt}</span>
      </div>
      <p style="color: #374151; line-height: 1.6;">
        at <strong>${schoolName}</strong>
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="color: #374151; line-height: 1.6; margin: 0;">
        This is a testament to your hard work, dedication, and perseverance. Keep training and pushing your limits!
      </p>
      <p style="color: #dc2626; font-size: 24px; margin: 15px 0 0 0; font-weight: bold;">
        OSS! 🥋
      </p>
    </div>
  `

  return {
    subject: `🏆 Congratulations on Your Belt Promotion - ${newBelt}!`,
    html: emailWrapper(content),
  }
}

export function getEventReminderEmail(
  userName: string,
  eventName: string,
  eventDate: string,
  schoolName: string
) {
  const content = `
    <div style="background: #eff6ff; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
      <h2 style="color: #1e40af; margin-top: 0;">📅 Event Reminder</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${userName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        This is a reminder that you are registered for an upcoming event:
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
      <h3 style="color: #dc2626; margin-top: 0; font-size: 20px;">${eventName}</h3>
      <table style="width: 100%; color: #374151;">
        <tr>
          <td style="padding: 8px 0; width: 100px;"><strong>📆 Date:</strong></td>
          <td style="padding: 8px 0;">${eventDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>📍 Location:</strong></td>
          <td style="padding: 8px 0;">${schoolName}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${APP_URL}/events"
         style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        View Event Details
      </a>
    </div>

    <p style="color: #6b7280; margin-top: 20px; font-size: 14px; text-align: center;">
      We look forward to seeing you there! 🥋
    </p>
  `

  return {
    subject: `📅 Reminder: ${eventName} at ${schoolName}`,
    html: emailWrapper(content),
  }
}

export function getTrialEndingEmail(schoolName: string, ownerName: string, daysLeft: number) {
  const content = `
    <div style="background: #fef3c7; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
      <h2 style="color: #92400e; margin-top: 0;">⏰ Trial Ending Soon</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${ownerName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Your free trial for <strong>${schoolName}</strong> on ${APP_NAME} ends in <span style="color: #dc2626; font-weight: bold; font-size: 18px;">${daysLeft} days</span>.
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
      <h3 style="color: #111; margin-top: 0; font-size: 16px;">Don't Lose Access To:</h3>
      <ul style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Student & family management</li>
        <li>Class scheduling & attendance tracking</li>
        <li>Belt rank progression system</li>
        <li>Event management & registration</li>
        <li>Billing & payment processing</li>
        <li>School announcements & feed</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/owner/subscription"
         style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
        Subscribe Now - $99/month
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Questions? Reply to this email and we'll be happy to help!
    </p>
  `

  return {
    subject: `⏰ Your ${APP_NAME} Trial Ends in ${daysLeft} Days`,
    html: emailWrapper(content),
  }
}

export function getPaymentReceiptEmail(
  ownerName: string,
  schoolName: string,
  amount: string,
  date: string
) {
  const content = `
    <div style="background: #f0fdf4; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
      <h2 style="color: #166534; margin-top: 0;">✅ Payment Received</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${ownerName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Thank you for your payment! Here's your receipt:
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
      <table style="width: 100%; color: #374151; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0;"><strong>School:</strong></td>
          <td style="padding: 12px 0; text-align: right;">${schoolName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0;"><strong>Date:</strong></td>
          <td style="padding: 12px 0; text-align: right;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0;"><strong>Amount Paid:</strong></td>
          <td style="padding: 12px 0; text-align: right; font-size: 20px; font-weight: bold; color: #22c55e;">${amount}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${APP_URL}/owner/billing"
         style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        View Billing History
      </a>
    </div>

    <p style="color: #6b7280; margin-top: 20px; font-size: 14px; text-align: center;">
      Thank you for being a ${APP_NAME} customer! 🙏
    </p>
  `

  return {
    subject: `✅ Payment Receipt - ${APP_NAME}`,
    html: emailWrapper(content),
  }
}

// New: Welcome Email for new school owners after completing registration
export function getWelcomeEmail(ownerName: string, schoolName: string) {
  const content = `
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px; padding: 40px; margin-bottom: 20px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 32px;">Welcome to ${APP_NAME}! 🥋</h1>
      <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">${schoolName} is now live!</p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
      <p style="color: #374151; line-height: 1.6;">
        Hi ${ownerName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Congratulations! Your school <strong>${schoolName}</strong> is now set up on ${APP_NAME}. You have a <strong>14-day free trial</strong> to explore all our features.
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
      <h3 style="color: #111; margin-top: 0; font-size: 16px;">🚀 Quick Start Guide:</h3>
      <ol style="color: #374151; line-height: 2; margin: 0; padding-left: 20px;">
        <li><strong>Set up your belt ranks</strong> - Customize your progression system</li>
        <li><strong>Create your class schedule</strong> - Add your weekly classes</li>
        <li><strong>Invite your students</strong> - Share your school's signup link</li>
        <li><strong>Create your first announcement</strong> - Welcome your community</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/owner"
         style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
        Go to Your Dashboard
      </a>
    </div>

    <div style="background: #eff6ff; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="color: #1e40af; margin: 0; font-size: 14px;">
        <strong>Need help?</strong> Reply to this email anytime - we're here to support you!
      </p>
    </div>
  `

  return {
    subject: `🎉 Welcome to ${APP_NAME} - Let's Get Started!`,
    html: emailWrapper(content),
  }
}

// New: Student/Parent signup notification to school owner
export function getNewMemberNotificationEmail(
  ownerName: string,
  memberName: string,
  memberEmail: string,
  memberRole: string,
  schoolName: string
) {
  const content = `
    <div style="background: #eff6ff; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
      <h2 style="color: #1e40af; margin-top: 0;">👤 New Member Request</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${ownerName},
      </p>
      <p style="color: #374151; line-height: 1.6;">
        A new ${memberRole} has requested to join <strong>${schoolName}</strong>:
      </p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
      <table style="width: 100%; color: #374151;">
        <tr>
          <td style="padding: 8px 0; width: 100px;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${memberName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;">${memberEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Role:</strong></td>
          <td style="padding: 8px 0; text-transform: capitalize;">${memberRole}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/owner/approvals"
         style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        Review & Approve
      </a>
    </div>
  `

  return {
    subject: `👤 New ${memberRole} Request - ${memberName}`,
    html: emailWrapper(content),
  }
}
