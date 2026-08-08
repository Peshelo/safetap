import api from "../api";
import { router } from "expo-router";

export default async function useLogout() {
  await api.auth.logout();
  router.replace("/(auth)/login");
}
