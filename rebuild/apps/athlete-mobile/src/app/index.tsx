import { Text, View } from "react-native";

export default function AthleteHomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0b0f14",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#f5f7fb", fontSize: 28, fontWeight: "700" }}>
        Ryxen Athlete Rebuild
      </Text>
      <Text style={{ color: "#9aa7bb", marginTop: 12, lineHeight: 22 }}>
        Esta base nova vai concentrar auth, import, treino, PRs, medidas,
        benchmark, running, strength, offline sync e billing do atleta.
      </Text>
    </View>
  );
}
