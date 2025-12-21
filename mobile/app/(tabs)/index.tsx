import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AccueilScreen() {
  const user = {
    name: 'Sarah Williams',
    email: 'sarawilliams@mail.com',
    co2Saved: '20%',
  };

  const menuItems = [
    {
      id: 1,
      title: 'Rapport de descente',
      icon: 'file-document-outline',
      iconType: 'MaterialCommunityIcons',
      color: '#3498db',
      description: 'Créer et gérer vos rapports de descente sur le terrain',
      route: '/(tabs)/rapport',
    },
    {
      id: 2,
      title: 'Rendez-vous',
      icon: 'calendar-clock',
      iconType: 'MaterialCommunityIcons',
      color: '#2ecc71',
      description: 'Planifier et consulter vos rendez-vous',
      route: '/(tabs)/rendezvous',
    },
    {
      id: 3,
      title: 'Cartographie',
      icon: 'map-outline',
      iconType: 'MaterialCommunityIcons',
      color: '#e74c3c',
      description: 'Accéder à la cartographie interactive',
      route: '/(tabs)/cartographie',
    },
    
  ];

  const renderIcon = (iconType: string, iconName: string, size: number, color: string) => {
    switch (iconType) {
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={size} color={color} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
      case 'MaterialIcons':
        return <MaterialIcons name={iconName as any} size={size} color={color} />;
      default:
        return <Ionicons name="home" size={size} color={color} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Header avec infos utilisateur */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={60} color="#3498db" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.co2Container}>
                <MaterialCommunityIcons name="leaf" size={16} color="#2ecc71" />
                <Text style={styles.co2Text}>Save CO2 {user.co2Saved}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Principal en ligne par ligne */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Menu Principal</Text>
          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <Link href={item.route} key={item.id} asChild>
                <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                      {renderIcon(item.iconType, item.icon, 28, item.color)}
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#bdc3c7" />
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        

       
         
      

        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  co2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc7115',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  co2Text: {
    fontSize: 14,
    color: '#27ae60',
    marginLeft: 6,
    fontWeight: '500',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  menuList: {
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    opacity: 0.8,
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  statCard: {
    alignItems: 'center',
    width: (width - 90) / 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activityContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAll: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  activityList: {
    marginTop: 5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2ecc71',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#2ecc7115',
    borderRadius: 12,
  },
  statusUpcoming: {
    color: '#f39c12',
    backgroundColor: '#f39c1215',
  },
  promotionCard: {
    backgroundColor: '#3498db',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 25,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  promotionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionText: {
    marginLeft: 15,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  promotionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});