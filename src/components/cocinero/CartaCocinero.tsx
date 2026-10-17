import CartaAdministracion from '../dueno/CartaAdministracion';

export default function CartaCocinero() {
  return <CartaAdministracion soloLectura soloTipoProducto="plato" />;
}
