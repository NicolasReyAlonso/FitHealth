import { StyleSheet } from 'react-native';
export const profileStyles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 0,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 32,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 52, 
    fontWeight: '800' 
  },
  username: { 
    fontSize: 32, 
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    color: '#FFFFFF',
  },
  email: { 
    fontSize: 16, 
    marginTop: 2,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  roleBadge: { 
    marginTop: 20, 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    paddingVertical: 10 
  },
  roleText: { 
    fontSize: 14, 
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: { 
    paddingHorizontal: 20, 
    gap: 14, 
    marginBottom: 32 
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: { 
    borderRadius: 16, 
    padding: 20, 
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoLeft: {
    flex: 1,
  },
  infoLabel: { 
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoValue: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  infoIcon: {
    fontSize: 28,
  },
  logoutButton: { 
    marginHorizontal: 20, 
    borderRadius: 14, 
    padding: 18, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: { 
    color: '#fff', 
    fontSize: 16,
    fontWeight: '700'
  },
});
