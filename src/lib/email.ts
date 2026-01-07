import nodemailer from 'nodemailer'
import { APP_NAME, APP_URL } from './constants'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    await transporter.sendMail({
      from: `${APP_NAME} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

// Email Templates
export function getApprovalEmail(userName: string, schoolName: string) {
  return {
    subject: `Welcome to ${schoolName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to ${schoolName}!</h1>
        <p>Hi ${userName},</p>
        <p>Your account has been approved! You can now log in and access all features.</p>
        <a href="${APP_URL}/login" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Log In Now
        </a>
        <p>Welcome to the ${APP_NAME} community!</p>
      </div>
    `,
  }
}

export function getDenialEmail(userName: string, schoolName: string) {
  return {
    subject: `${schoolName} Account Update`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Account Update</h1>
        <p>Hi ${userName},</p>
        <p>Unfortunately, your account request for ${schoolName} was not approved at this time.</p>
        <p>If you believe this was a mistake, please contact the school directly.</p>
      </div>
    `,
  }
}

export function getPasswordResetEmail(userName: string, resetLink: string) {
  return {
    subject: `Reset Your ${APP_NAME} Password`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Password Reset</h1>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  }
}

export function getBeltPromotionEmail(
  studentName: string,
  schoolName: string,
  newBelt: string
) {
  return {
    subject: `Congratulations on Your Belt Promotion!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Congratulations!</h1>
        <p>Hi ${studentName},</p>
        <p>Great news! You have been promoted to <strong>${newBelt}</strong> at ${schoolName}!</p>
        <p>This is a testament to your hard work and dedication. Keep up the great training!</p>
        <p>OSS!</p>
      </div>
    `,
  }
}

export function getEventReminderEmail(
  userName: string,
  eventName: string,
  eventDate: string,
  schoolName: string
) {
  return {
    subject: `Reminder: ${eventName} at ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Event Reminder</h1>
        <p>Hi ${userName},</p>
        <p>This is a reminder that you are registered for:</p>
        <h2 style="color: #dc2626;">${eventName}</h2>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Location:</strong> ${schoolName}</p>
        <p>We look forward to seeing you there!</p>
      </div>
    `,
  }
}

export function getTrialEndingEmail(schoolName: string, ownerName: string, daysLeft: number) {
  return {
    subject: `Your ${APP_NAME} Trial Ends in ${daysLeft} Days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Trial Ending Soon</h1>
        <p>Hi ${ownerName},</p>
        <p>Your free trial for ${schoolName} on ${APP_NAME} ends in <strong>${daysLeft} days</strong>.</p>
        <p>To continue using all features without interruption, please subscribe to our monthly plan ($99/month).</p>
        <a href="${APP_URL}/owner/subscription" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Subscribe Now
        </a>
        <p>Questions? Reply to this email and we'll be happy to help!</p>
      </div>
    `,
  }
}

export function getPaymentReceiptEmail(
  ownerName: string,
  schoolName: string,
  amount: string,
  date: string
) {
  return {
    subject: `Payment Receipt - ${APP_NAME}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Payment Receipt</h1>
        <p>Hi ${ownerName},</p>
        <p>Thank you for your payment for ${schoolName}.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Amount:</strong> ${amount}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>School:</strong> ${schoolName}</p>
        </div>
        <p>Thank you for being a ${APP_NAME} customer!</p>
      </div>
    `,
  }
}
