import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const resend = new Resend(process.env.RESEND_API_KEY);

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name } = schema.parse(body);

    // Save to database
    await prisma.waitlist.create({
      data: { email, name },
    });

    // Create contact in Resend
    await resend.contacts.create({
      email,
      firstName: name || undefined,
      unsubscribed: false,
      audienceId: "5eeff6c8-df9f-4dfe-9fb2-e93130d93686",
    });

    // Send welcome email
    await resend.emails.send({
      from: "FluidCalendar <emad@fluidcalendar.com>",
      to: email,
      subject: "Welcome to FluidCalendar Beta Waitlist!",
      html: `
        <h1>Welcome to FluidCalendar!</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thank you for joining the FluidCalendar beta waitlist. I'll keep you updated on our progress and let you know when you can access the beta.</p>
        <p>In the meantime, you can check out our open-source repository at <a href="https://github.com/dotnetfactory/fluid-calendar">github.com/dotnetfactory/fluid-calendar</a>.</p>
        <p>I'd love to hear from you! Please reply to this email and let me know:</p>
        <ul>
          <li>Which calendar provider do you currently use? (Google Calendar, Outlook, etc.)</li>
          <li>What features would you consider must-haves for FluidCalendar?</li>
          <li>Any specific pain points with your current calendar solution?</li>
        </ul>
        <p>Your feedback will help me prioritize features and ensure FluidCalendar meets your needs.</p>
        <p>Best regards,<br>Emad Ibrahim<br>Founder, FluidCalendar</p>
      `,
      text: `Welcome to FluidCalendar!

Hi ${name || "there"},

Thank you for joining the FluidCalendar beta waitlist. I'll keep you updated on our progress and let you know when you can access the beta.

In the meantime, you can check out our open-source repository at: https://github.com/dotnetfactory/fluid-calendar

I'd love to hear from you! Please reply to this email and let me know:

1. Which calendar provider do you currently use? (Google Calendar, Outlook, etc.)
2. What features would you consider must-haves for FluidCalendar?
3. Any specific pain points with your current calendar solution?

Your feedback will help me prioritize features and ensure FluidCalendar meets your needs.

Best regards,
Emad Ibrahim
Founder, FluidCalendar`,
    });

    // Send notification to admin
    await resend.emails.send({
      from: "FluidCalendar <emad@fluidcalendar.com>",
      to: process.env.ADMIN_EMAIL!,
      subject: "New Beta Waitlist Signup",
      html: `
        <p>New signup for FluidCalendar beta:</p>
        <p>Email: ${email}<br>Name: ${name || "Not provided"}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Waitlist error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to process signup", details: errorMessage },
      { status: 500 }
    );
  }
}
