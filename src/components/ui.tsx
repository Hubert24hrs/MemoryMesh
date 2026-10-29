import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { haptic } from '../lib/haptics';
import { radius, space, type as typeScale, useTheme } from '../theme/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type Variant = keyof typeof typeScale;
type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'danger' | 'onAccent';

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { c } = useTheme();
  const color = {
    default: c.text,
    muted: c.textMuted,
    faint: c.textFaint,
    accent: c.accentText,
    danger: c.danger,
    onAccent: c.onAccent,
  }[tone];
  return <Text {...props} style={[typeScale[variant], { color }, style]} />;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.surfaceAlt, ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: c.onAccent, secondary: c.text, ghost: c.accentText, danger: c.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        kind === 'danger' && { borderWidth: StyleSheet.hairlineWidth, borderColor: c.danger },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={18} color={fg} />}
          <AppText variant="bodyMedium" style={{ color: fg }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  active,
  size = 22,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  active?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Feather name={icon} size={size} color={active ? c.accentText : c.textMuted} />
    </Pressable>
  );
}

export function Chip({
  label,
  onPress,
  selected,
  icon,
  onRemove,
}: {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  icon?: IconName;
  onRemove?: () => void;
}) {
  const { c } = useTheme();
  const content = (
    <View
      style={[
        styles.chip,
        { backgroundColor: selected ? c.accentSoft : c.surfaceAlt, borderColor: selected ? c.accent : 'transparent' },
      ]}
    >
      {icon && <Feather name={icon} size={12} color={selected ? c.accentText : c.textMuted} />}
      <AppText variant="label" tone={selected ? 'accent' : 'muted'} numberOfLines={1}>
        {label}
      </AppText>
      {onRemove && (
        <Pressable hitSlop={8} onPress={onRemove} accessibilityLabel={`Remove ${label}`}>
          <Feather name="x" size={12} color={c.textFaint} />
        </Pressable>
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      {content}
    </Pressable>
  );
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...base, { opacity: pressed ? 0.8 : 1 }]}>
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="label" tone="faint" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

export function SettingRow({
  label,
  detail,
  icon,
  value,
  onValueChange,
  onPress,
  tone,
  disabled,
}: {
  label: string;
  detail?: string;
  icon?: IconName;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  tone?: Tone;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <View style={[styles.row, { borderBottomColor: c.border, opacity: disabled ? 0.5 : 1 }]}>
      {icon && <Feather name={icon} size={18} color={tone === 'danger' ? c.danger : c.textMuted} />}
      <View style={{ flex: 1 }}>
        <AppText tone={tone}>{label}</AppText>
        {detail ? (
          <AppText variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {onValueChange ? (
        <Switch
          value={!!value}
          disabled={disabled}
          onValueChange={(v) => {
            haptic.tap();
            onValueChange(v);
          }}
          trackColor={{ true: c.accent, false: c.surfaceAlt }}
          thumbColor="#FFFFFF"
        />
      ) : onPress ? (
        <Feather name="chevron-right" size={18} color={c.textFaint} />
      ) : null}
    </View>
  );
  if (!onPress || disabled) return body;
  return <Pressable onPress={onPress}>{body}</Pressable>;
}

export function Field(props: TextInputProps & { style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textFaint}
      selectionColor={c.accent}
      {...props}
      style={[typeScale.body, styles.field, { color: c.text, backgroundColor: c.surface, borderColor: c.border }, props.style]}
    />
  );
}

export function EmptyState({ icon, text, children }: { icon: IconName; text: string; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={28} color={c.textFaint} />
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  iconButton: { padding: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 220,
  },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  field: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12 },
  empty: { alignItems: 'center', gap: space.md, padding: space.xxl },
});
