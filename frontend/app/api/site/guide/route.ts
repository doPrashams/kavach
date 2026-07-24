import { NextResponse } from "next/server";

import {
  ABOUT_ME,
  DEPLOYMENT_INFO,
  SITE_INSTRUCTIONS,
  TECH_STACK,
  TOUR_STEPS,
} from "@/lib/site-content";
import { listScenarioDetails } from "@/lib/scenarios";

export async function GET() {
  return NextResponse.json({
    instructions: SITE_INSTRUCTIONS,
    about: ABOUT_ME,
    tech_stack: TECH_STACK,
    tour: TOUR_STEPS,
    scenarios: listScenarioDetails(),
    deployment: DEPLOYMENT_INFO,
  });
}
