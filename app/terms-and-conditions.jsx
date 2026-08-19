import React from "react";
import LegalDocumentPage from "./components/LegalDocumentPage";

const sections = [
  {
    title: "1. Acceptance of terms",
    paragraphs: [
      "These Terms and Conditions govern your use of SafeTap. By accessing or using the app, you agree to these terms. If you do not agree, do not use the service.",
    ],
  },
  {
    title: "2. Purpose of SafeTap",
    paragraphs: [
      "SafeTap provides access to Zimbabwe Republic Police information and selected public-safety services, including police contacts, nearby stations, news, reporting tools, and emergency features.",
      "Availability may vary by location, device, connectivity, and operational circumstances.",
    ],
  },
  {
    title: "3. Emergencies",
    paragraphs: [
      "SafeTap does not guarantee that an electronic request will be received or acted on immediately. If there is immediate danger, use the official emergency telephone channels or go to the nearest police station when safe to do so.",
      "Location and map information may be delayed or inaccurate. Always use your judgment and follow instructions from emergency personnel.",
    ],
  },
  {
    title: "4. Acceptable use",
    paragraphs: [
      "You must use SafeTap lawfully and responsibly. You must not submit false reports, impersonate another person, harass others, interfere with the service, attempt unauthorised access, introduce harmful code, or use information from the app for unlawful purposes.",
      "Misuse may result in restricted access and may be referred for investigation or legal action.",
    ],
  },
  {
    title: "5. Your submissions",
    paragraphs: [
      "You are responsible for the accuracy and lawfulness of information you submit. You authorise ZRP to use and share submitted information as reasonably necessary to provide the service, assess reports, respond to incidents, and meet legal obligations.",
    ],
  },
  {
    title: "6. Information and third-party services",
    paragraphs: [
      "We aim to keep information accurate, but content may change and may occasionally be incomplete or unavailable. Maps, directions, websites, telephone networks, and other third-party services are governed by their own terms and policies.",
    ],
  },
  {
    title: "7. Service changes and liability",
    paragraphs: [
      "Features may be changed, suspended, or withdrawn for maintenance, security, legal, or operational reasons.",
      "To the extent permitted by applicable law, ZRP is not responsible for losses caused by device failure, connectivity problems, third-party services, inaccurate user submissions, unauthorised use, or reliance on the app as the sole means of obtaining emergency assistance.",
    ],
  },
  {
    title: "8. Privacy, changes, and contact",
    paragraphs: [
      "Use of personal information is described in the SafeTap Privacy Policy. We may revise these terms, and the effective date above identifies the current version.",
      "For help or questions about these terms, email support@zrp.co.zw.",
    ],
  },
];

export default function TermsAndConditions() {
  return <LegalDocumentPage title="Terms & Conditions" subtitle="Rules for using SafeTap" effectiveDate="19 August 2026" sections={sections} />;
}
