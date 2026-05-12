import { Redirect, useLocalSearchParams } from "expo-router";

export default function CircleRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/" />;
  return <Redirect href={`/circle/${id}/board` as any} />;
}
