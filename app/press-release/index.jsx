import { Redirect } from "expo-router";

// Preserve old bookmarks while the bottom-tab News screen remains the single
// source of truth for both news and press-release listings.
export default function PressReleaseRedirect() {
  return <Redirect href="/(tabs)/news" />;
}
