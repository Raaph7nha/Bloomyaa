import { Plant } from '../types';

export const plants: Plant[] = [
  {
    id: 'snake-plant',
    name: 'Lengua de Suegra',
    scientificName: 'Sansevieria trifasciata',
    category: 'Indoor',
    image: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?q=80&w=1000&auto=format&fit=crop',
    description: 'La Sansevieria, popularmente conocida como "Lengua de Suegra" o "Espada de San Jorge", es una de las plantas de interior más robustas y elegantes que existen. Su característica más distintiva son sus hojas erectas, rígidas y coriáceas que pueden crecer hasta un metro de altura. Es famosa por su capacidad para purificar el aire, filtrando toxinas como el formaldehído y el benceno, y curiosamente produce oxígeno durante la noche, a diferencia de la mayoría de las plantas. Es prácticamente indestructible, lo que la convierte en la compañera ideal para principiantes o personas con poco tiempo.',
    care: {
      water: 'Cada 2-3 semanas; dejar que el sustrato se seque completamente entre riegos.',
      light: 'Muy versátil: desde luz indirecta brillante hasta rincones con poca luz.',
      soil: 'Sustrato poroso para cactus o suculentas que garantice un drenaje perfecto.',
      temperature: 'Se mantiene feliz entre 15°C y 30°C; evitar heladas.',
      difficulty: 'Easy'
    }
  },
  {
    id: 'monstera',
    name: 'Costilla de Adán',
    scientificName: 'Monstera deliciosa',
    category: 'Tropical',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=1000&auto=format&fit=crop',
    description: 'La Monstera Deliciosa es la reina indiscutible del diseño de interiores contemporáneo. Originaria de las selvas tropicales de América Central, esta trepadora es conocida por sus enormes hojas verdes brillantes que desarrollan "fenestraciones" (agujeros y cortes) a medida que la planta madura, una técnica evolutiva para permitir que la luz pase a las hojas inferiores y para resistir fuertes vientos. En su hábitat natural produce frutos comestibles, aunque en interior es apreciada exclusivamente por su follaje espectacular. Requiere espacio para expandirse y un tutor si se desea que crezca verticalmente.',
    care: {
      water: 'Semanalmente o cuando los primeros 3cm de tierra estén secos al tacto.',
      light: 'Abundante luz indirecta para fomentar el desarrollo de sus famosos agujeros.',
      soil: 'Mezcla rica en materia orgánica, turba y perlita para mantener humedad sin encharcar.',
      temperature: 'Ambientes cálidos entre 18°C y 28°C; sensible a corrientes de aire frío.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    scientificName: 'Lavandula angustifolia',
    category: 'Flowering',
    image: 'https://images.unsplash.com/photo-1595165121404-f584749377be?q=80&w=1000&auto=format&fit=crop',
    description: 'La Lavanda es mucho más que una planta decorativa; es un festín para los sentidos. Este subarbusto perenne del Mediterráneo es venerado por su fragancia inconfundible y sus espigas de flores púrpuras que atraen a polinizadores como abejas y mariposas. Sus aceites esenciales se utilizan ampliamente en aromaterapia para reducir el estrés. En el jardín, aporta una estructura plateada y un aroma que evoca los campos de la Provenza. Es una planta extremadamente resistente que prefiere condiciones que imiten su origen costero y soleado.',
    care: {
      water: 'Escaso. Regar solo cuando la tierra esté muy seca; es muy sensible al exceso de humedad.',
      light: 'Sol pleno directo; al menos 6 a 8 horas diarias de luz solar intensa.',
      soil: 'Pobre, alcalino y con drenaje excelente. Los suelos arenosos son ideales.',
      temperature: 'Muy resistente al calor y tolera heladas moderadas; prefiere climas secos.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'aloe-vera',
    name: 'Aloe Vera',
    scientificName: 'Aloe barbadensis Miller',
    category: 'Succulent',
    image: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?q=80&w=1000&auto=format&fit=crop',
    description: 'El Aloe Vera es la "planta farmacia" por excelencia. Sus hojas carnosas y dentadas contienen un gel transparente rico en vitaminas, minerales y aminoácidos con propiedades curativas asombrosas para quemaduras, cortes e irritaciones cutáneas. Estéticamente, forma una roseta basal compacta de color verde grisáceo que encaja en decoraciones modernas y minimalistas. Como suculenta, almacena agua en sus tejidos, lo que le permite sobrevivir largos periodos de sequía. Es una planta agradecida que, si recibe el sol suficiente, puede regalarte flores tubulares amarillas o naranjas.',
    care: {
      water: 'Cada 3 semanas en verano y casi nada en invierno. Evitar que el agua se acumule en la roseta.',
      light: 'Luz solar directa o luz muy brillante cerca de una ventana.',
      soil: 'Sustrato específico para cactus y suculentas con mucha arena o perlita.',
      temperature: 'Prefiere calor (20°C-30°C) pero puede soportar hasta 5°C si el suelo está seco.',
      difficulty: 'Easy'
    }
  },
  {
    id: 'fiddle-leaf-fig',
    name: 'Ficus Lyrata',
    scientificName: 'Ficus lyrata',
    category: 'Tropical',
    image: 'https://images.unsplash.com/photo-1598935881439-c96767793d48?q=80&w=1000&auto=format&fit=crop',
    description: 'El Ficus Lyrata, también llamado Higuera de Hoja de Violín, es la joya de la corona de la botánica de interior. Sus hojas son inmensas, con una forma que recuerda al cuerpo de un violín, de un verde oscuro profundo y textura coriácea. Es una planta que hace una declaración de estilo inmediata en cualquier salón. Sin embargo, tiene fama de ser la "diva" de las plantas; odia los cambios de ubicación, las corrientes de aire y las fluctuaciones drásticas en el riego. Una vez que encuentras su lugar perfecto, crecerá majestuosamente hacia el techo.',
    care: {
      water: 'Riego constante pero moderado; el suelo debe mantenerse ligeramente húmedo pero nunca empapado.',
      light: 'Mucha luz indirecta muy brillante. La luz filtrada por una cortina ligera es perfecta.',
      soil: 'Sustrato bien drenado basado en turba con buen aporte de nutrientes.',
      temperature: 'Estable entre 18°C y 24°C. Evitar cambios bruscos de temperatura.',
      difficulty: 'Advanced'
    }
  },
  {
    id: 'peace-lily',
    name: 'Lirio de la Paz',
    scientificName: 'Spathiphyllum',
    category: 'Flowering',
    image: 'https://images.unsplash.com/photo-1593691509543-c35d426d60a8?q=80&w=1000&auto=format&fit=crop',
    description: 'El Espatifilo o Lirio de la Paz es la planta perfecta para iluminar espacios con luz moderada. Sus brillantes hojas lanceoladas de color verde oscuro contrastan maravillosamente con sus inflorescencias blancas (espatas) que parecen velas. Además de su belleza, es una de las plantas top en purificación de aire según la NASA. Tiene una forma muy clara de "pedir" agua: sus hojas decaen visiblemente cuando tiene sed, recuperándose casi mágicamente tras el riego. Simboliza la paz y la armonía, siendo un regalo ideal para el hogar.',
    care: {
      water: 'Frecuente. Mantener el sustrato húmedo durante el crecimiento. Pulverizar las hojas si el ambiente es seco.',
      light: 'Sombra parcial o luz indirecta suave. El sol directo quema sus hojas rápidamente.',
      soil: 'Sustrato universal de buena calidad que retenga la humedad pero drene bien.',
      temperature: 'Idealmente entre 18°C y 25°C. Proteger del frío intenso.',
      difficulty: 'Easy'
    }
  },
  {
    id: 'calathea-orbifolia',
    name: 'Calathea Orbifolia',
    scientificName: 'Goeppertia orbifolia',
    category: 'Indoor',
    image: 'https://images.unsplash.com/photo-1614594865324-2c2c31862ca1?q=80&w=1000&auto=format&fit=crop',
    description: 'La Calathea Orbifolia es una planta de "oración" conocida por sus hojas circulares de gran tamaño decoradas con elegantes franjas plateadas y verdes. Lo más fascinante de la familia de las Calateas es que mueven sus hojas rítmicamente durante el día, levantándolas por la noche como si estuvieran rezando (nictinastia). Son plantas de sotobosque selvático, por lo que adoran la humedad alta y la luz suave. Son perfectas para personas que disfrutan cuidando los detalles, ya que requieren atención constante a la humedad ambiental.',
    care: {
      water: 'Mantener el suelo constantemente húmedo pero no saturado. Usar agua filtrada o reposada.',
      light: 'Luz indirecta media. Tolera la semisombra. Evitar la luz brillante para no perder el dibujo de las hojas.',
      soil: 'Mezcla rica en turba que retenga bien la humedad pero permita la aireación.',
      temperature: 'Cálida, entre 18°C y 24°C. Humedad ambiental superior al 50%.',
      difficulty: 'Advanced'
    }
  },
  {
    id: 'pothos-marble',
    name: 'Potus Marble Queen',
    scientificName: 'Epipremnum aureum',
    category: 'Indoor',
    image: 'https://images.unsplash.com/photo-1597055181300-e3633a917c9c?q=80&w=1000&auto=format&fit=crop',
    description: 'El Potus es el clásico infalible del mundo vegetal. La variedad "Marble Queen" destaca por su espectacular veteado blanco y crema sobre fondo verde. Es una planta trepadora o colgante extremadamente versátil; puede lucir en una estantería alta dejando caer sus ramas o subir por una columna de musgo. Es famosa por su resistencia a casi cualquier descuido, lo que la hace la mejor planta de "entrenamiento" para nuevos dueños de plantas. Además, crece a una velocidad asombrosa, permitiéndote ver resultados rápidamente.',
    care: {
      water: 'Moderado. Dejar secar la mitad superior del sustrato antes de volver a regar.',
      light: 'De luz baja a luz indirecta brillante. Cuanto más luz reciba, más blanco será su veteado.',
      soil: 'Sustrato universal con buena capacidad de drenaje.',
      temperature: 'Temperaturas normales de hogar. Muy adaptable.',
      difficulty: 'Easy'
    }
  },
  {
    id: 'bird-of-paradise',
    name: 'Ave del Paraíso',
    scientificName: 'Strelitzia reginae',
    category: 'Outdoor',
    image: 'https://images.unsplash.com/photo-1620127252536-030369c09930?q=80&w=1000&auto=format&fit=crop',
    description: 'La Strelitzia es la reina de las plantas tropicales de exterior. Sus flores son una maravilla de la naturaleza, con una forma que recuerda la cabeza de una grulla o pájaro exótico en tonos naranja y azul eléctrico. Sus hojas son grandes, coriáceas y de un verde grisáceo, similares a las de un banano, lo que le confiere un aire arquitectónico muy potente. Es ideal para terrazas amplias o jardines soleados donde pueda convertirse en el punto focal. Con el tiempo, forma grandes macizos que llenan de vida cualquier espacio abierto.',
    care: {
      water: 'Regular en verano, dejando secar la superficie; escaso en invierno.',
      light: 'Pleno sol; necesita mucha energía lumínica para florecer.',
      soil: 'Cualquier suelo fértil y bien drenado. Agradece el abonado regular.',
      temperature: 'Climas suaves. Tolera el frío ligero pero no las heladas persistentes.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'olive-tree',
    name: 'Olivo',
    scientificName: 'Olea europaea',
    category: 'Outdoor',
    image: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?q=80&w=1000&auto=format&fit=crop',
    description: 'El Olivo es el símbolo ancestral del Mediterráneo: paz, victoria y longevidad. Este árbol de crecimiento lento es increíblemente longevo (pudiendo vivir miles de años) y tiene un tronco retorcido que se vuelve más artístico con la edad. Sus pequeñas hojas perennes, verdes por un lado y plateadas por el otro, brillan bajo el sol. Aunque es un árbol, se adapta sorprendentemente bien a grandes macetas en terrazas o patios interiores muy luminosos. Aporta un toque rústico y sofisticado a partes iguales.',
    care: {
      water: 'Escaso. Es muy resistente a la sequía una vez establecido en la maceta o suelo.',
      light: 'Sol directo absoluto. Cuanta más luz reciba, más sano crecerá.',
      soil: 'Suelos calizos, pedregosos y sobre todo muy bien drenados.',
      temperature: 'Muy resistente al calor y al frío. Necesita pasar algo de frío en invierno para producir flores.',
      difficulty: 'Easy'
    }
  },
  {
    id: 'jade-plant',
    name: 'Árbol de Jade',
    scientificName: 'Crassula ovata',
    category: 'Succulent',
    image: 'https://images.unsplash.com/photo-1620216147690-3490715cb983?q=80&w=1000&auto=format&fit=crop',
    description: 'El Árbol de Jade es conocido en muchas culturas como la "planta del dinero" o la "planta de la suerte". Es una suculenta arbustiva con tallos gruesos y leñosos y hojas ovaladas, carnosas y de un verde brillante, a menudo con bordes rojizos si recibe sol directo. Tiene un porte que recuerda a un bonsái natural sin necesidad de mucha poda. Es extremadamente longeva y suele pasar de generación en generación en las familias. Simboliza la prosperidad y la buena fortuna constante.',
    care: {
      water: 'Poco. Dejar secar la tierra por completo. Reducir al mínimo en invierno.',
      light: 'Luz brillante a sol directo. Necesita luz para mantener su forma compacta.',
      soil: 'Específico para suculentas con perlita o arena volcánica.',
      temperature: 'Prefiere ambientes secos y cálidos. Proteger de temperaturas bajo cero.',
      difficulty: 'Easy'
    }
  },
  {
    id: 'string-of-pearls',
    name: 'Rosario',
    scientificName: 'Senecio rowleyanus',
    category: 'Succulent',
    image: 'https://images.unsplash.com/photo-1598114840003-882298bc3600?q=80&w=1000&auto=format&fit=crop',
    description: 'El Senecio rowleyanus es una de las suculentas más curiosas y deseadas. Sus hojas se han transformado en pequeñas esferas verdes que parecen guisantes o perlas, ensartadas en tallos delgados que cuelgan como hilos. Esta forma esférica le ayuda a minimizar la pérdida de agua. Es espectacular en macetas colgantes, donde sus "hilos de perlas" pueden llegar a medir más de un metro. Cuando florece, produce pequeñas flores blancas con un sorprendente aroma a canela.',
    care: {
      water: 'Riego por inmersión ocasional. El exceso de humedad pudre sus "perlas" rápidamente.',
      light: 'Luz indirecta brillante. El sol directo del mediodía puede quemar las esferas.',
      soil: 'Drenaje impecable. Mezcla de cactus con algo de gravilla.',
      temperature: 'Cálida. Evitar las heladas y el exceso de humedad ambiental.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'philodendron-pink',
    name: 'Filodendro Pink Princess',
    scientificName: 'Philodendron erubescens',
    category: 'Tropical',
    image: 'https://images.unsplash.com/photo-1628109605809-913a48e77c8e?q=80&w=1000&auto=format&fit=crop',
    description: 'La Pink Princess es el unicornio de las plantas de interior. Sus hojas oscuras, casi negras, estallan con manchas y salpicaduras de un rosa vibrante y natural. No hay dos hojas iguales, lo que hace que cada planta sea una pieza de arte única. Esta planta trepadora de la selva colombiana es objeto de deseo entre coleccionistas. Para mantener ese color rosa tan intenso, la planta requiere condiciones de luz muy específicas; de lo contrario, las hojas nuevas volverán a ser totalmente verdes.',
    care: {
      water: 'Cuando la superficie del suelo esté seca. Aprecia la humedad alta en el aire.',
      light: 'Luz indirecta muy brillante. Vital para mantener la coloración rosa.',
      soil: 'Mezcla aireada de corteza de pino, perlita y sustrato universal.',
      temperature: 'Hogar cálido (18°C-25°C). Nunca por debajo de 15°C.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'anthurium',
    name: 'Anturio Rojo',
    scientificName: 'Anthurium andraeanum',
    category: 'Flowering',
    image: 'https://images.unsplash.com/photo-1596711584988-25164bc77174?q=80&w=1000&auto=format&fit=crop',
    description: 'El Anturio es la planta de floración continua más duradera que puedes tener en casa. Sus "flores" son en realidad espatas cerosas en forma de corazón de un rojo brillante y lacado, que rodean un espádice central. Estas estructuras pueden durar meses. Sus hojas también son hermosas, con forma de corazón y un verde intenso. Originaria de las zonas tropicales de Colombia y Ecuador, aporta una nota de color exótica y apasionada a cualquier decoración interior.',
    care: {
      water: 'Regular, manteniendo ligera humedad. Pulverizar agua (sin cal) sobre las hojas.',
      light: 'Mucha luz indirecta pero sin sol directo, que quemaría sus espatas.',
      soil: 'Sustrato muy poroso, rico en turba y con buen drenaje.',
      temperature: 'Necesita calor constante. No tolera el frío ni las corrientes.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'boston-fern',
    name: 'Helecho de Boston',
    scientificName: 'Nephrolepis exaltata',
    category: 'Indoor',
    image: 'https://images.unsplash.com/photo-1596701062351-be5f6a21034e?q=80&w=1000&auto=format&fit=crop',
    description: 'El Helecho de Boston es un clásico que nunca pasa de moda. Sus frondas largas y arqueadas, llenas de pequeños folíolos, crean una explosión de verde plumoso y suave. Es excelente para colgar o colocar en pedestales altos donde sus hojas puedan caer con gracia. Históricamente asociado con la época victoriana, hoy es apreciado por su gran capacidad para humidificar y limpiar el ambiente. Es la planta ideal para cuartos de baño luminosos con alta humedad.',
    care: {
      water: 'Frecuente. Nunca dejes que el suelo se seque por completo. Adora que lo vaporicen.',
      light: 'Luz filtrada o sombra ligera. Evitar a toda costa el sol directo.',
      soil: 'Sustrato rico en nutrientes que retenga la humedad (con base de turba).',
      temperature: 'Clima fresco y húmedo. Evitar la calefacción directa.',
      difficulty: 'Moderate'
    }
  },
  {
    id: 'croton',
    name: 'Crotón',
    scientificName: 'Codiaeum variegatum',
    category: 'Tropical',
    image: 'https://images.unsplash.com/photo-1598880940375-60c7042a492b?q=80&w=1000&auto=format&fit=crop',
    description: 'El Crotón es probablemente la planta con el follaje más colorido que existe. Sus hojas rígidas pueden mostrar una mezcla psicodélica de amarillo, naranja, rojo, rosa y verde, todo en una misma planta. Es como un estallido de otoño tropical perpetuo. Sin embargo, es una planta que exige atención: requiere mucha luz para mantener sus colores vivos y es sensible al frío excesivo. Si la cuidas bien, se convertirá en la pieza central más vibrante de tu colección botánica.',
    care: {
      water: 'Moderado. Regar bien una vez que la superficie esté seca. No dejar que se seque del todo.',
      light: 'Luz muy intensa e incluso algo de sol directo suave para potenciar los colores.',
      soil: 'Sustrato fértil y bien drenado. Agradece el abono en primavera y verano.',
      temperature: 'Calor tropical estable. Tolera mal las temperaturas por debajo de 16°C.',
      difficulty: 'Moderate'
    }
  }
];
