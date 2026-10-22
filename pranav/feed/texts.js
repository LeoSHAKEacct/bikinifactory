// Every editable text on /feed/: [key, label shown in the admin, default].
// The teacher's values live in feed.json "texts"; empty = default.
window.FEED_TEXTS = [
  { group: 'Encabezado', items: [
    ['pageTitle', 'Título en la pestaña del navegador (vacío = el título principal)', 'Sitios de la clase'],
    ['metaDescription', 'Descripción para Google y al compartir el link', 'Todos los negocios y páginas creados por los estudiantes.'],
    ['brand', 'Logo (arriba a la izquierda)', 'Sitios'],
    ['eyebrow', 'Texto pequeño sobre el título', 'Directorio'],
    ['search', 'Texto dentro del buscador', 'Buscar por nombre, tipo de negocio o ciudad…'],
    ['all', 'Filtro "todos"', 'Todos'],
    ['countOne', 'Contador: 1', 'sitio'],
    ['countMany', 'Contador: varios', 'sitios'],
    ['noResults', 'Cuando la búsqueda no encuentra nada', 'No hay sitios que coincidan.'],
    ['prevPage', 'Botón página anterior', 'Anterior'],
    ['nextPage', 'Botón página siguiente', 'Siguiente']
  ] },
  { group: 'Tarjetas de los sitios', items: [
    ['viewSite', 'Botón para abrir un sitio', 'Ver sitio'],
    ['whatsapp', 'Botón de WhatsApp', 'WhatsApp'],
    ['waMessage', 'Mensaje de WhatsApp ({nombre} = nombre del sitio)', 'Hola {nombre}, vi tu página'],
    ['by', 'Antes del nombre del estudiante', 'por']
  ] },
  { group: 'Botones de cuenta', items: [
    ['login', 'Botón entrar', 'Entrar'],
    ['signup', 'Botón crear cuenta', 'Crear cuenta'],
    ['mine', 'Botón mis sitios', 'Mis sitios'],
    ['logout', 'Botón salir', 'Salir'],
    ['hello', 'Saludo antes del nombre', 'Hola,']
  ] },
  { group: 'Ventana de entrar / crear cuenta', items: [
    ['authName', 'Campo nombre', 'Tu nombre'],
    ['authEmail', 'Campo correo', 'Correo'],
    ['authPass', 'Campo contraseña', 'Contraseña']
  ] },
  { group: 'Mis sitios (estudiante con sesión)', items: [
    ['mineTitle', 'Título', 'Mis sitios'],
    ['newSite', 'Botón crear sitio', '+ Crear nuevo sitio'],
    ['mineEmpty', 'Cuando aún no tiene sitios', 'Todavía no tienes sitios. Pulsa + Crear nuevo sitio para empezar desde una plantilla.'],
    ['published', 'Estado publicado', 'Publicado'],
    ['unpublished', 'Estado sin publicar', 'Sin publicar'],
    ['view', 'Botón ver', 'Ver'],
    ['edit', 'Botón editar', 'Editar']
  ] },
  { group: 'Pie de página', items: [
    ['footer', 'Texto', 'Páginas creadas por los estudiantes'],
    ['footerLink', 'Link al final', 'Crear la mía']
  ] }
];
