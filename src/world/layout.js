import * as THREE from 'three';

/*
 * Plan de la boutique, en mètres, dans le repère de la photo de rue :
 * la caméra de départ est au milieu de la ruelle (0, 1,7, 0), la ruelle file vers +x,
 * et la boutique occupe le rez-de-chaussée de l'immeuble de droite (vers +z).
 *
 *   vue depuis la rue :  [ vitrine comptoir | porte | vitrine salle ]
 *                          x = 5,65 … 3,75    3,65…2,55   2,45 … 0,8
 */
export const SHOP = {
  x0: 0.7, // mur côté salle
  x1: 6.4, // mur côté comptoir (au-delà de la façade, caché par le pilier)
  zFront: 4.2, // nu extérieur de la façade
  zIn: 4.4, // début de la salle
  zBack: 14,
  h: 3.3, // hauteur sous plafond
};

export const DOOR = { x0: 2.55, x1: 3.65 };

export const COUNTER = { xFront: 4.2, xBack: 4.85, z0: 5.2, z1: 12.2, top: 0.95 };
export const BACKBAR = { x0: 5.75, x1: 6.4, top: 0.92 };

export const TABLES_Z = [6.4, 8.0, 9.6, 11.2, 12.8];
export const MEAL_POS = new THREE.Vector3(1.65, 0.765, 9.6);

// positions le long du comptoir
export const SPOTS = {
  broche: 6.1,
  pain: 7.6,
  crudites: 9.2,
  sauces: 10.75,
  toppings: 11.7,
};
