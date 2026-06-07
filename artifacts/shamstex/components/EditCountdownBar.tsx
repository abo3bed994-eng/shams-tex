import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "@/components/Icon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// Height of the visible countdown row (excluding the status-bar safe area). The
// bar overlays the top of the screen via absolute positioning while a matching
// flow spacer of this height pushes the screens below down, so the bar never
// covers page content.
const CONTENT_H = 40;

export default function EditCountdownBar() {
  const { orders, user, setOrderEditable } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const closedRef = useRef<string | null>(null);

  // The current customer's order that is in an active (armed) edit window.
  const editOrder = useMemo(() => {
    if (!user || (user.role !== "customer" && user.role !== "merchant")) return null;
    return (
      orders.find(
        (o) =>
          o.editable &&
          o.editableExpiresAt &&
          o.status !== "cancelled" &&
          o.userId === user.id
      ) ?? null
    );
  }, [orders, user]);

  useEffect(() => {
    if (!editOrder) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [editOrder?.id]);

  const remaining = editOrder?.editableExpiresAt
    ? new Date(editOrder.editableExpiresAt).getTime() - now
    : 0;

  // Auto-close editing on expiry (no save). Reset the guard while time remains so
  // a re-armed window on the same order can expire and close again later.
  useEffect(() => {
    if (!editOrder) return;
    if (remaining > 0) {
      if (closedRef.current === editOrder.id) closedRef.current = null;
      return;
    }
    if (closedRef.current === editOrder.id) return;
    closedRef.current = editOrder.id;
    setOrderEditable(editOrder.id, false);
  }, [editOrder?.id, remaining]);

  if (!editOrder || remaining <= 0) return null;

  const totalSec = Math.max(0, Math.floor(remaining / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 60;
  const barColor = urgent ? "#E74C3C" : colors.gold;

  return (
    <>
      <View style={{ height: CONTENT_H }} />
      <Pressable
        onPress={() => router.push(`/order/${editOrder.id}` as any)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          backgroundColor: barColor,
          zIndex: 1000,
          elevation: 8,
        }}
      >
        <View
          style={{
            height: CONTENT_H,
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 16,
          }}
        >
          <Icon name="clock" size={16} color="#0A0A0A" />
          <Text
            style={{
              color: "#0A0A0A",
              fontFamily: "Inter_700Bold",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            لديك {mm}:{ss} لتعديل طلبك — اضغط للمتابعة
          </Text>
        </View>
      </Pressable>
    </>
  );
}
