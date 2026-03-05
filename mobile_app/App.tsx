import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const API_BASE = "http://172.16.3.10:8000";

export default function App() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("1234");
  const [isLoading, setIsLoading] = useState(false);

  const login = async () => {
    setIsLoading(true);
    try {
      const body = new URLSearchParams({ username, password }).toString();
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.detail ?? "Login failed");
      }

      const payload = await response.json();
      Alert.alert("Login successful", `Access token: ${String(payload.access_token).slice(0, 16)}...`);
    } catch (error) {
      Alert.alert("Login failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>BMNS Mobile</Text>
        <Text style={styles.subtitle}>ISP Billing & Network Automation</Text>

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Username"
          placeholderTextColor="#94a3b8"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity style={styles.button} onPress={login} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Login"}</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    borderColor: "#1e293b",
    borderWidth: 1,
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#06b6d4",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#082f49",
    fontSize: 15,
    fontWeight: "700",
  },
});
