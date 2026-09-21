import { Redirect } from 'expo-router';

// La entrada histórica también utiliza el inicio compartido de Dueño y Supervisor.
export default function HomeSupervisor() {
  return <Redirect href="/(app)/home" />;
}
