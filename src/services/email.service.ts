import { Resend } from "resend";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
} from "@/templates/emails";

export class EmailService {
  private resendClient: Resend;
  private readonly fromAddress: string;

  constructor() {
    // Initialize Resend client
    this.resendClient = new Resend(ENV.RESEND_API_KEY);
    this.fromAddress = ENV.SMTP_FROM || "noreply@example.com";

    logger.info("Using Resend configuration", {
      context: "EmailService.constructor",
      apiKey: ENV.RESEND_API_KEY ? "*****" : "Missing API Key", // Masking API Key in logs
    });

    // Add email template precompilation
    this.precompileTemplates();
  }

  private precompileTemplates() {
    try {
      getVerificationEmailTemplate("test", "test"); // Pre-compile by running once
      getPasswordResetEmailTemplate("test", "test"); // Pre-compile by running once
      logger.info("Email templates precompiled successfully");
    } catch (error) {
      logger.error("Failed to precompile email templates", { error });
    }
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${ENV.SERVER_URL}/api/auth/verify-email/${verificationToken}`; // TODO: Change this to frontend URL

    try {
      const emailContent = getVerificationEmailTemplate(name, verificationUrl);

      const result = await this.resendClient.emails.send({
        from: this.fromAddress,
        to,
        subject: "Verify your email address",
        html: emailContent,
      });

      const messageId = result.data?.id;

      logger.info("Verification email sent", {
        context: "EmailService.sendVerificationEmail",
        to,
        messageId,
      });
    } catch (error) {
      logger.error("Failed to send verification email", {
        context: "EmailService.sendVerificationEmail",
        error: error instanceof Error ? error.message : "Unknown error",
        to,
      });
      throw error;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${ENV.SERVER_URL}/reset-password/${resetToken}`; // TODO: Change this to frontend URL

    try {
      const emailContent = getPasswordResetEmailTemplate(name, resetUrl);

      const result = await this.resendClient.emails.send({
        from: this.fromAddress,
        to,
        subject: "Reset Your Password",
        html: emailContent,
      });

      const messageId = result.data?.id;
      console.log({ result });

      logger.info("Password reset email sent", {
        context: "EmailService.sendPasswordResetEmail",
        to,
        messageId,
      });
    } catch (error) {
      logger.error("Failed to send password reset email", {
        context: "EmailService.sendPasswordResetEmail",
        error: error instanceof Error ? error.message : "Unknown error",
        to,
      });
      throw error;
    }
  }
}
