export const languages = { en: 'English', fr: 'Français', es: 'Español' } as const
export type Locale = keyof typeof languages
let locale: Locale = 'en'
export function chooseLocale(value: unknown): Locale {
  const language = typeof value === 'string' ? value.toLowerCase().split('-')[0] : ''
  return language === 'fr' || language === 'es' ? language : 'en'
}
export function setLocale(value: Locale) { locale = value }
export function getLocale() { return locale }

const catalog: Record<string, readonly [string, string]> = {
  'Play': ['Jouer', 'Jugar'],
  'Sandbox': ['Bac à sable', 'Modo libre'],
  'How to Play': ['Comment jouer', 'Cómo jugar'],
  'Storm Records': ['Records des tempêtes', 'Récords de tormentas'],
  'Settings': ['Paramètres', 'Ajustes'],
  'Back': ['Retour', 'Atrás'],
  'Choose a weather event': ['Choisir un événement météo', 'Elige un fenómeno meteorológico'],
  'Weather events': ['Événements météo', 'Fenómenos meteorológicos'],
  'Choose a difficulty': ['Choisir la difficulté', 'Elige la dificultad'],
  'Choose difficulty': ['Choisir la difficulté', 'Elige la dificultad'],
  'Choose any weather event and experiment with unlimited Momentum.': ['Choisissez un événement et essayez des stratégies avec un élan illimité.', 'Elige un fenómeno y prueba estrategias con impulso ilimitado.'],
  'All weather events unlocked.': ['Tous les événements météo sont débloqués.', 'Todos los fenómenos meteorológicos están desbloqueados.'],
  'Touch down as an EF0 funnel. Spend Momentum to shape its track, damage and resilience.': ['Touchez le sol à EF0. Dépensez de l’élan pour modifier la trajectoire, les dégâts et la résistance.', 'Toca tierra como EF0. Gasta impulso para cambiar la trayectoria, los daños y la resistencia.'],
  'Build strength over warm water, then make landfall.': ['Renforcez-vous sur les eaux chaudes, puis touchez terre.', 'Gana fuerza sobre aguas cálidas y luego toca tierra.'],
  'Build a moving snow band and use cold air and water to deepen snowfall.': ['Formez une bande de neige et utilisez l’air froid et l’eau pour intensifier les chutes.', 'Forma una banda de nieve y usa aire frío y agua para intensificar las nevadas.'],
  'Choose a storm type in Evolve and build its abilities.': ['Choisissez un type d’orage et développez ses capacités dans Évoluer.', 'Elige un tipo de tormenta y mejora sus habilidades en Evolucionar.'],
  'Easy': ['Facile', 'Fácil'],
  'Medium': ['Moyen', 'Media'],
  'Hard': ['Difficile', 'Difícil'],
  'Expert': ['Expert', 'Experta'],
  'Tornado': ['Tornade', 'Tornado'],
  'Hurricane': ['Ouragan', 'Huracán'],
  'Blizzard': ['Tempête de neige', 'Ventisca'],
  'Thunderstorm': ['Orage', 'Tormenta eléctrica'],
  'Wildfire': ['Feu de forêt', 'Incendio forestal'],
  'Formation': ['Formation', 'Formación'],
  'Movement': ['Déplacement', 'Movimiento'],
  'Damage': ['Dégâts', 'Daños'],
  'Lifespan': ['Durée de vie', 'Duración'],
  'Resistance': ['Résistance', 'Resistencia'],
  'Abilities': ['Capacités', 'Habilidades'],
  'Impact': ['Impact', 'Impacto'],
  'Disruption': ['Perturbation', 'Alteración'],
  'Evolve': ['Évoluer', 'Evolucionar'],
  'Begin': ['Commencer', 'Comenzar'],
  'World': ['Monde', 'Mundo'],
  'World map': ['Carte du monde', 'Mapa mundial'],
  'Storm view': ['Vue de la tempête', 'Vista de la tormenta'],
  'Region': ['Région', 'Región'],
  'Forecast ended': ['Prévision terminée', 'Pronóstico terminado'],
  'Forecast complete': ['Prévision terminée', 'Pronóstico completado'],
  'Select an origin': ['Choisir un point de départ', 'Elige un punto de partida'],
  'Ready to form': ['Prêt à se former', 'Listo para formarse'],
  'Enter coordinates': ['Saisir les coordonnées', 'Introducir coordenadas'],
  'Latitude': ['Latitude', 'Latitud'],
  'Longitude': ['Longitude', 'Longitud'],
  'Set drop point': ['Placer le point de départ', 'Fijar punto de inicio'],
  'Hurricane name': ['Nom de l’ouragan', 'Nombre del huracán'],
  'Paused': ['En pause', 'En pausa'],
  'Detected': ['Détecté', 'Detectado'],
  'Unnoticed': ['Inaperçu', 'Sin detectar'],
  'Strengthening': ['Renforcement', 'Intensificación'],
  'Weakening': ['Affaiblissement', 'Debilitamiento'],
  'Steady': ['Stable', 'Estable'],
  'Pause': ['Pause', 'Pausa'],
  'Resume': ['Reprendre', 'Continuar'],
  'Cancel': ['Annuler', 'Cancelar'],
  'Close': ['Fermer', 'Cerrar'],
  'Confirm': ['Confirmer', 'Confirmar'],
  'Main menu': ['Menu principal', 'Menú principal'],
  'Back to pause menu': ['Retour au menu de pause', 'Volver al menú de pausa'],
  'Restart': ['Recommencer', 'Reiniciar'],
  'Retry': ['Réessayer', 'Reintentar'],
  'Retry same forecast': ['Rejouer cette prévision', 'Repetir este pronóstico'],
  'New forecast': ['Nouvelle prévision', 'Nuevo pronóstico'],
  'Next': ['Suivant', 'Siguiente'],
  'Exit': ['Quitter', 'Salir'],
  'Explore damage': ['Explorer les dégâts', 'Explorar los daños'],
  'Final storm report': ['Bilan final de la tempête', 'Informe final de la tormenta'],
  'Read news': ['Lire les nouvelles', 'Leer las noticias'],
  'News': ['Actualités', 'Noticias'],
  'Storm news': ['Actualités météo', 'Noticias de la tormenta'],
  'Breaking news': ['Dernière heure', 'Última hora'],
  'Dismiss headline': ['Fermer le bulletin', 'Cerrar el boletín'],
  'No headlines yet': ['Aucun bulletin pour le moment', 'Todavía no hay titulares'],
  'News paused': ['Fil d’actualités en pause', 'Noticias en pausa'],
  'Severe weather detected. Local alerts are being issued.': ['Intempéries détectées. Des alertes locales sont émises.', 'Se detectó tiempo severo. Se están emitiendo alertas locales.'],
  'Weather station confirms a tornado on the ground.': ['Une station météo confirme une tornade au sol.', 'Una estación meteorológica confirma un tornado en tierra.'],
  'Fire crews deploy and begin building containment lines.': ['Les équipes se déploient et établissent des lignes de confinement.', 'Las brigadas se despliegan y empiezan a construir líneas de contención.'],
  'Aircraft begin dropping retardant along the fire perimeter.': ['Les avions larguent du retardant le long du périmètre du feu.', 'Los aviones comienzan a lanzar retardante a lo largo del perímetro del incendio.'],
  'Starting speed': ['Vitesse initiale', 'Velocidad inicial'],
  'You can still change the speed during a run.': ['Vous pouvez changer la vitesse pendant la partie.', 'Puedes cambiar la velocidad durante la partida.'],
  'Measurement units': ['Unités de mesure', 'Unidades de medida'],
  'Imperial (miles)': ['Impériales (milles)', 'Imperiales (millas)'],
  'Metric (kilometers)': ['Métriques (kilomètres)', 'Métricas (kilómetros)'],
  'News alerts': ['Alertes météo', 'Alertas meteorológicas'],
  'Standard': ['Standard', 'Estándar'],
  'Major alerts only': ['Alertes majeures uniquement', 'Solo alertas importantes'],
  'Quiet': ['Silencieux', 'Silencio'],
  'Language': ['Langue', 'Idioma'],
  'Mute sound': ['Couper le son', 'Silenciar sonido'],
  'Master volume': ['Volume général', 'Volumen general'],
  'Effects volume': ['Volume des effets', 'Volumen de efectos'],
  'Leaderboards': ['Classements', 'Clasificaciones'],
  'Submit score': ['Publier le score', 'Enviar puntuación'],
  'Save score': ['Enregistrer le score', 'Guardar puntuación'],
  'This device': ['Cet appareil', 'Este dispositivo'],
  'Global': ['Mondial', 'Global'],
  'Scores saved on this device': ['Scores enregistrés sur cet appareil', 'Puntuaciones guardadas en este dispositivo'],
  'Score saved on this device.': ['Score enregistré sur cet appareil.', 'Puntuación guardada en este dispositivo.'],
  'This browser could not save the score.': ['Le navigateur n’a pas pu enregistrer le score.', 'El navegador no pudo guardar la puntuación.'],
  'Display name': ['Pseudonyme', 'Nombre público'],
  'Event': ['Événement', 'Fenómeno'],
  'Difficulty': ['Difficulté', 'Dificultad'],
  'Metric': ['Indicateur', 'Métrica'],
  'Period': ['Période', 'Período'],
  'Board': ['Classement', 'Tabla'],
  'Free placement': ['Placement libre', 'Ubicación libre'],
  'Play daily challenge': ['Jouer le défi du jour', 'Jugar el reto diario'],
  'Origin': ['Point de départ', 'Origen'],
  'Campaign stars': ['Étoiles de campagne', 'Estrellas de campaña'],
  'Settlements affected': ['Localités touchées', 'Localidades afectadas'],
  'Modeled duration': ['Durée simulée', 'Duración simulada'],
  'Tornadoes dropped': ['Tornades déclenchées', 'Tornados lanzados'],
  'All time': ['Depuis le début', 'Todo el tiempo'],
  'This month': ['Ce mois-ci', 'Este mes'],
  'Player': ['Joueur', 'Jugador'],
  'Score': ['Score', 'Puntuación'],
  'Rank': ['Rang', 'Posición'],
  'Deaths': ['Décès', 'Muertes'],
  'Injured': ['Blessés', 'Heridos'],
  'Population': ['Population', 'Población'],
  'Country': ['Pays', 'País'],
  'Wind': ['Vent', 'Viento'],
  'Width': ['Largeur', 'Anchura'],
  'Wind speed': ['Vitesse du vent', 'Velocidad del viento'],
  'Momentum': ['Élan', 'Impulso'],
  'Unlimited Momentum': ['Élan illimité', 'Impulso ilimitado'],
  'Storm strength': ['Force de la tempête', 'Fuerza de la tormenta'],
  'Inflow reserve': ['Réserve d’air entrant', 'Reserva de aire entrante'],
  'Upgrades installed': ['Améliorations installées', 'Mejoras instaladas'],
  'Installed': ['Installée', 'Instalada'],
  'Locked': ['Verrouillée', 'Bloqueada'],
  'Free': ['Gratuite', 'Gratis'],
  'Remove upgrade': ['Retirer l’amélioration', 'Quitar mejora'],
  'Buy upgrade': ['Acheter l’amélioration', 'Comprar mejora'],
  'Active': ['Actif', 'Activo'],
  'Drop tornado': ['Déclencher une tornade', 'Soltar un tornado'],
  'Send embers': ['Envoyer des braises', 'Lanzar brasas'],
  'Ocean heat pulse': ['Apport de chaleur océanique', 'Pulso de calor oceánico'],
  'Snowburst': ['Rafale de neige', 'Ráfaga de nieve'],
  'Warm Air': ['Air chaud', 'Aire cálido'],
  'Warm Water': ['Eau chaude', 'Agua cálida'],
  'Lake Moisture': ['Humidité du lac', 'Humedad del lago'],
  'Storm surge': ['Onde de tempête', 'Marejada ciclónica'],
  'Loading…': ['Chargement…', 'Cargando…'],
  'No ranked runs yet.': ['Aucune partie classée pour le moment.', 'Todavía no hay partidas clasificadas.'],
  'Shared scores are unavailable right now.': ['Les scores partagés sont indisponibles.', 'Las puntuaciones compartidas no están disponibles.'],
  'Shared scores need a configured server.': ['Les scores partagés nécessitent un serveur configuré.', 'Las puntuaciones compartidas requieren un servidor configurado.'],
  'Rain and hail': ['Pluie et grêle', 'Lluvia y granizo'],
  'Precipitation': ['Précipitations', 'Precipitación'],
  'Submitting…': ['Envoi…', 'Enviando…'],
  'Score submitted.': ['Score publié.', 'Puntuación enviada.'],
  'Retry submission': ['Réessayer l’envoi', 'Reintentar envío'],
}

export function t(key: string) { return locale === 'en' ? key : catalog[key]?.[locale === 'fr' ? 0 : 1] ?? key }

const numbers = new Map<string, Intl.NumberFormat>()
export function localizedNumber(value: number, digits = 0) {
  const key = locale + digits
  let formatter = numbers.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, { maximumFractionDigits: digits })
    numbers.set(key, formatter)
  }
  return formatter.format(value)
}

export function translateMarkup(html: string) {
  if (locale === 'en') return html
  const template = document.createElement('template')
  template.innerHTML = html
  const textNodes = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  while (textNodes.nextNode()) {
    const node = textNodes.currentNode
    if (node.parentElement?.closest('[data-player-text],svg')) continue
    const value = node.textContent ?? ''
    const key = value.trim()
    if (key && key in catalog) node.textContent = value.replace(key, t(key))
  }
  for (const element of template.content.querySelectorAll('[aria-label], [title], [placeholder]')) {
    for (const name of ['aria-label', 'title', 'placeholder']) {
      const value = element.getAttribute(name)
      if (value && value in catalog) element.setAttribute(name, t(value))
    }
  }
  return template.innerHTML
}
