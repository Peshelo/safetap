import React from "react";
import { Ionicons as ExpoIonicons } from "@expo/vector-icons";

const aliases = {
  "add-circle": "add-circle-outline", building: "business", bullhorn: "megaphone",
  camera: "camera", call: "call", "check-circle": "checkmark-circle", "chevron-left": "chevron-back",
  "chevron-right": "chevron-forward", close: "close", "contact-phone": "person-circle",
  copy: "copy-outline", "delete-outline": "trash-outline", directions: "navigate",
  emergency: "warning", "file-alt": "document-text-outline", "filter-list-off": "filter-circle-outline",
  home: "home", image: "image-outline", "import-contacts": "people-outline", info: "information-circle",
  "info-circle": "information-circle", "insert-drive-file": "document-attach-outline",
  "location-off": "location-outline", "location-on": "location", "map-marked-alt": "map",
  navigation: "navigate", newspaper: "newspaper", "paper-plane": "send", phone: "call",
  "phone-alt": "call", plus: "add", refresh: "refresh", report: "alert-circle", schedule: "time-outline",
  search: "search", "shield-alt": "shield-checkmark", sos: "warning", straighten: "resize-outline",
  sync: "sync", target: "locate", tasks: "list", "timer-sand": "hourglass-outline",
  "user-shield": "shield-checkmark", whatsapp: "logo-whatsapp",
  about: "information-circle", contacts: "people", news: "newspaper", services: "grid",
  "traffic-light": "car-sport", "radio-button-unchecked": "ellipse-outline",
  "police-badge": "shield", ambulance: "medical", "fire-extinguisher": "flame",
  bolt: "flash", tint: "water", road: "car", "hands-helping": "heart",
  landmark: "business", user: "person", "first-aid": "medkit", "share-alt": "share-social",
  "clipboard-check": "clipboard", badge: "ribbon",
};

const LegacyIonicon = ({ name, ...props }) => {
  const requestedName = aliases[name] || name;
  const resolvedName = requestedName && ExpoIonicons.glyphMap?.[requestedName]
    ? requestedName
    : "help-circle-outline";
  return <ExpoIonicons name={resolvedName} {...props} />;
};

export const Ionicons = LegacyIonicon;
export default Ionicons;
