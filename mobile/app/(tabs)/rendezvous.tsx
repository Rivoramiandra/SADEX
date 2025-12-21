import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const appointments = [
  { id: '1', title: 'Réunion client', date: 'Aujourd\'hui, 14:00', location: 'Bureau principal' },
  { id: '2', title: 'Inspection site', date: 'Demain, 09:30', location: 'Site industriel A' },
  { id: '3', title: 'Présentation équipe', date: '12 Déc, 11:00', location: 'Salle de conférence' },
  { id: '4', title: 'Formation sécurité', date: '15 Déc, 13:30', location: 'Centre de formation' },
];

export default function RendezVousScreen() {
  const renderAppointment = ({ item }: { item: any }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentIcon}>
        <Ionicons name="calendar" size={24} color="#3498db" />
      </View>
      <View style={styles.appointmentInfo}>
        <Text style={styles.appointmentTitle}>{item.title}</Text>
        <View style={styles.appointmentDetails}>
          <Ionicons name="time-outline" size={16} color="#7f8c8d" />
          <Text style={styles.appointmentText}>{item.date}</Text>
        </View>
        <View style={styles.appointmentDetails}>
          <Ionicons name="location-outline" size={16} color="#7f8c8d" />
          <Text style={styles.appointmentText}>{item.location}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rendez-vous</Text>
        <Text style={styles.subtitle}>Vos prochains rendez-vous</Text>
      </View>
      
      <FlatList
        data={appointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  list: {
    padding: 20,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  appointmentIcon: {
    marginRight: 15,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  appointmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 6,
  },
});