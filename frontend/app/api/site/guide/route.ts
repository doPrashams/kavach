import { NextResponse } from "next/server";

import {
  ABOUT_ME,
  DEPLOYMENT_INFO,
  SITE_INSTRUCTIONS,
  TECH_STACK,
  TOUR_STEPS,
} from "@/lib/site-content";

export async function GET() {
  return NextResponse.json({
    instructions: SITE_INSTRUCTIONS,
    about: ABOUT_ME,
    tech_stack: TECH_STACK,
    tour: TOUR_STEPS,
    deployment: DEPLOYMENT_INFO,
  });
}
