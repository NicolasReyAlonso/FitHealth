import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';


export const profileStyles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 4 },
  roleBadge: { marginTop: 8, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  roleText: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  logoutButton: { marginHorizontal: 20, backgroundColor: '#EF5350', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
