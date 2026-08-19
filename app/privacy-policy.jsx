import React from "react";
import LegalDocumentPage from "./components/LegalDocumentPage";

const sections = [
  {
    title: "1. About this policy",
    paragraphs: [
      "This Privacy Policy explains how SafeTap, a Zimbabwe Republic Police service, handles information when you use the mobile application.",
      "By using SafeTap, you acknowledge the practices described in this policy.",
    ],
  },
  {
    title: "2. Information we may collect",
    paragraphs: [
      "We may collect information you provide, including contact details, reports, complaint information, and content submitted through the app.",
      "With your permission, SafeTap may access your location to show nearby police stations, support directions, or include your position in an emergency request. Contact access is used only when you choose to import emergency contacts.",
      "We may also receive limited technical information such as device type, app version, network status, and diagnostic data needed to operate and secure the service.",
    ],
  },
  {
    title: "3. How information is used",
    paragraphs: [
      "Information is used to provide police and emergency features, process submissions, display relevant services, improve reliability, prevent misuse, and protect users and the public.",
      "Emergency information may be used to coordinate an appropriate response. Do not submit information you know to be false or misleading.",
    ],
  },
  {
    title: "4. Sharing and disclosure",
    paragraphs: [
      "Information may be shared with authorised ZRP personnel, emergency responders, service providers supporting SafeTap, or other authorities where necessary to respond to a request, comply with the law, protect safety, or investigate misuse.",
      "SafeTap does not sell your personal information for advertising purposes.",
    ],
  },
  {
    title: "5. Storage and security",
    paragraphs: [
      "We use reasonable administrative and technical safeguards to protect information. Some app data may be stored locally on your device to support offline features.",
      "No electronic system is completely secure. Keep your device protected and report suspected unauthorised access promptly.",
    ],
  },
  {
    title: "6. Retention and your choices",
    paragraphs: [
      "Information is retained only as long as reasonably required for service, safety, legal, evidential, and operational purposes. Retention periods may vary depending on the type of record.",
      "You can control location, contact, and notification permissions through your device settings. Disabling a permission may limit related features.",
    ],
  },
  {
    title: "7. Children",
    paragraphs: [
      "SafeTap is a public-safety service and is not designed to collect children's information unnecessarily. A parent, guardian, or responsible adult should assist a child where practical, except when urgent help is required.",
    ],
  },
  {
    title: "8. Changes and contact",
    paragraphs: [
      "We may update this policy when the service or applicable requirements change. The effective date shown above identifies the latest version.",
      "For privacy questions or support, email support@zrp.co.zw.",
    ],
  },
];

export default function PrivacyPolicy() {
  return <LegalDocumentPage title="Privacy Policy" subtitle="How SafeTap handles your data" effectiveDate="19 August 2026" sections={sections} />;
}
