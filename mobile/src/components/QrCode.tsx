import QRCode from 'qrcode';
import React, { useMemo } from 'react';
import { View } from 'react-native';

/** QR Code วาดด้วย View ล้วน (ใช้ได้ทั้งเว็บและมือถือ ไม่ต้องใช้ canvas/svg) */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = modules.size;
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => modules.get(r, c) === 1));
  }, [value]);

  const quiet = 4;
  const cell = Math.max(2, Math.floor(size / (rows.length + quiet * 2)));
  return (
    <View
      style={{ backgroundColor: '#fff', padding: cell * quiet, alignSelf: 'center', borderRadius: 12 }}
      accessibilityRole="image"
      accessibilityLabel={`QR Code: ${value}`}
    >
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((dark, c) => (
            <View key={c} style={{ width: cell, height: cell, backgroundColor: dark ? '#000' : '#fff' }} />
          ))}
        </View>
      ))}
    </View>
  );
}
