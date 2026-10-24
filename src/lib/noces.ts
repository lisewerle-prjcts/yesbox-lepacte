// Noms traditionnels des « noces » par nombre d'années de mariage, avec le
// nom anglais, la forme « du/de la/de l' » et quelques idées de petits
// cadeaux symboliques (e-mail d'anniversaire de mariage, une semaine avant).

export interface Noces {
  fr: string
  en: string
  /** « du coton », « de la laine », « de l'étain ». */
  autour: string
  idees?: { fr: string; en: string }
}

const n = (fr: string, en: string, autour: string, idees?: [string, string]): Noces =>
  ({ fr, en, autour, idees: idees ? { fr: idees[0], en: idees[1] } : undefined })

// « noces de bois », « noces d’or ».
export function nomNoces(noces: Noces) {
  return /^[aeéèêiouâîôûh]/i.test(noces.fr) ? `noces d’${noces.fr}` : `noces de ${noces.fr}`
}

export const NOCES: Record<number, Noces> = {
  1: n('coton', 'cotton', 'du coton', ['un plaid à partager, ou un tote bag brodé à vos initiales', 'a throw to share, or a tote bag embroidered with your initials']),
  2: n('cuir', 'leather', 'du cuir', ['un porte-clés ou un carnet en cuir gravé à vos initiales', 'a leather key ring or notebook engraved with your initials']),
  3: n('froment', 'wheat', 'du froment', ['un bon pain partagé au petit-déjeuner, ou un bouquet d’épis séchés', 'a good loaf shared at breakfast, or a bunch of dried wheat']),
  4: n('cire', 'wax', 'de la cire', ['une bougie parfumée à allumer ensemble', 'a scented candle to light together']),
  5: n('bois', 'wood', 'du bois', ['un objet sculpté, une boîte à souvenirs gravée, ou un arbre à planter ensemble', 'a carved object, an engraved keepsake box, or a tree to plant together']),
  6: n('chypre', 'chypre', 'du chypre', ['un parfum chypré, ou une plante aromatique', 'a chypre fragrance, or an aromatic plant']),
  7: n('laine', 'wool', 'de la laine', ['une écharpe ou un plaid tout doux', 'a soft scarf or throw']),
  8: n('coquelicot', 'poppy', 'du coquelicot', ['un bouquet de fleurs rouges', 'a bunch of red flowers']),
  9: n('faïence', 'earthenware', 'de la faïence', ['deux bols ou une jolie assiette en faïence', 'two earthenware bowls or a pretty plate']),
  10: n('étain', 'tin', 'de l’étain', ['un petit gobelet gravé', 'a small engraved cup']),
  11: n('corail', 'coral', 'du corail', ['un bijou couleur corail', 'a piece of coral-coloured jewellery']),
  12: n('soie', 'silk', 'de la soie', ['un foulard ou une pochette en soie', 'a silk scarf or pocket square']),
  13: n('muguet', 'lily of the valley', 'du muguet', ['un brin de muguet, ou un parfum au muguet', 'a sprig of lily of the valley, or a lily-of-the-valley scent']),
  14: n('plomb', 'lead', 'du plomb', ['un objet vintage chiné ensemble', 'a vintage find picked out together']),
  15: n('cristal', 'crystal', 'du cristal', ['deux verres en cristal pour trinquer', 'two crystal glasses to toast with']),
  16: n('saphir', 'sapphire', 'du saphir'),
  17: n('rose', 'rose', 'de la rose', ['un rosier à planter, ou un bouquet de roses', 'a rose bush to plant, or a bunch of roses']),
  18: n('turquoise', 'turquoise', 'de la turquoise'),
  19: n('cretonne', 'cretonne', 'de la cretonne'),
  20: n('porcelaine', 'china', 'de la porcelaine', ['deux tasses assorties', 'two matching cups']),
  21: n('opale', 'opal', 'de l’opale'),
  22: n('bronze', 'bronze', 'du bronze'),
  23: n('béryl', 'beryl', 'du béryl'),
  24: n('satin', 'satin', 'du satin'),
  25: n('argent', 'silver', 'de l’argent', ['un bijou ou un cadre photo en argent', 'a piece of silver jewellery or a silver photo frame']),
  26: n('jade', 'jade', 'du jade'),
  27: n('acajou', 'mahogany', 'de l’acajou'),
  28: n('nickel', 'nickel', 'du nickel'),
  29: n('velours', 'velvet', 'du velours'),
  30: n('perle', 'pearl', 'de la perle', ['un bijou orné d’une perle', 'a piece of jewellery set with a pearl']),
  31: n('basane', 'sheepskin', 'de la basane'),
  32: n('cuivre', 'copper', 'du cuivre'),
  33: n('porphyre', 'porphyry', 'du porphyre'),
  34: n('ambre', 'amber', 'de l’ambre'),
  35: n('rubis', 'ruby', 'du rubis'),
  36: n('mousseline', 'muslin', 'de la mousseline'),
  37: n('papier', 'paper', 'du papier', ['une lettre écrite à la main, ou un album de vos plus belles photos', 'a handwritten letter, or an album of your best photos']),
  38: n('mercure', 'mercury', 'du mercure'),
  39: n('crêpe', 'crepe', 'du crêpe'),
  40: n('émeraude', 'emerald', 'de l’émeraude', ['un bijou vert émeraude', 'an emerald-green piece of jewellery']),
  41: n('fer', 'iron', 'du fer'),
  42: n('nacre', 'mother-of-pearl', 'de la nacre'),
  43: n('flanelle', 'flannel', 'de la flanelle'),
  44: n('topaze', 'topaz', 'de la topaze'),
  45: n('vermeil', 'vermeil', 'du vermeil'),
  46: n('lavande', 'lavender', 'de la lavande', ['un bouquet ou un sachet de lavande', 'a bunch or a sachet of lavender']),
  47: n('cachemire', 'cashmere', 'du cachemire', ['une écharpe en cachemire', 'a cashmere scarf']),
  48: n('améthyste', 'amethyst', 'de l’améthyste'),
  49: n('cèdre', 'cedar', 'du cèdre'),
  50: n('or', 'gold', 'de l’or', ['un bijou en or, ou une soirée dorée à deux', 'a gold piece of jewellery, or a golden evening for two']),
  55: n('orchidée', 'orchid', 'de l’orchidée', ['une orchidée', 'an orchid']),
  60: n('diamant', 'diamond', 'du diamant'),
  65: n('fer', 'iron', 'du fer'),
  70: n('platine', 'platinum', 'du platine'),
  75: n('albâtre', 'alabaster', 'de l’albâtre'),
  80: n('chêne', 'oak', 'du chêne', ['un jeune chêne à planter', 'a young oak tree to plant']),
}
