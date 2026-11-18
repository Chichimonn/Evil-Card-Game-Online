/**
 * Each card's type line as the card text database words it (e.g. "Basic Unit.", "Promote a Knight.", "Fusion: 1 Mage +
 * 1 Plunderer.", "Tribute 2: At least 1 Flaming."), shown under the name on the card face. Display only: how a card is
 * reinforced is read from its `reinforce` data. A card missing here shows a type line made from that data instead.
 */
export const TYPE_LINES: Record<string, string> = {
  // ---- Tokens ----
  "obstructing_wall": "Token Unit.", // Obstructing Wall
  "raging_bonfire": "Token Unit.", // Raging Bonfire
  "toadstool": "Token Unit.", // Toadstool
  "freak": "Token Unit.", // Freak
  "apparition": "Token Unit.", // Apparition

  // ---- Realms of Man ----
  "sentinel_knight": "Basic Unit.", // Sentinel Knight
  "duelist_fighter": "Basic Unit.", // Duelist Fighter
  "shade_assassin": "Basic Unit.", // Shade Assassin
  "archivist_sage": "Basic Unit.", // Archivist Sage
  "powder_keg_plunderer": "Basic Unit.", // Powder Keg Plunderer
  "combat_cook": "Basic Unit.", // Combat Cook
  "battle_engineer": "Basic Unit.", // Battle Engineer
  "conflict_correspondent": "Basic Unit.", // Conflict Correspondent
  "happy_camper": "Basic Unit.", // Happy Camper
  "imbued_knight": "Basic Unit.", // Imbued Knight
  "polearm_knight": "Basic Unit.", // Polearm Knight
  "greatsword_knight": "Basic Unit.", // Greatsword Knight
  "longbow_knight": "Basic Unit.", // Longbow Knight
  "bastion_knight": "Basic Unit.", // Bastion Knight
  "euclase_mage": "Basic Unit.", // Euclase Mage
  "garnet_mage": "Basic Unit.", // Garnet Mage
  "opal_mage": "Basic Unit.", // Opal Mage
  "dravite_mage": "Basic Unit.", // Dravite Mage
  "amethyst_mage": "Basic Unit.", // Amethyst Mage
  "halberd_fighter": "Basic Unit.", // Halberd Fighter
  "spear_fighter": "Basic Unit.", // Spear Fighter
  "crossbow_fighter": "Basic Unit.", // Crossbow Fighter
  "dual_sword_fighter": "Basic Unit.", // Dual-Sword Fighter
  "brawl_fighter": "Basic Unit.", // Brawl Fighter
  "cutthroat_assassin": "Basic Unit.", // Cutthroat Assassin
  "poisonblade_assassin": "Basic Unit.", // Poisonblade Assassin
  "blood_sage": "Basic Unit.", // Blood Sage
  "fateweaver_sage": "Basic Unit.", // Fateweaver Sage
  "swashbuckle_plunderer": "Basic Unit.", // Swashbuckle Plunderer
  "twinaxe_plunderer": "Basic Unit.", // Twinaxe Plunderer
  "daring_cavalier": "Promote a Knight.", // Daring Cavalier
  "orders_chosen": "Promote a Knight.", // Order's Chosen
  "ironclad_peacekeeper": "Promote a Knight.", // Hardened Peacekeeper
  "vanguard_commander": "Promote a Knight.", // Vanguard Commander
  "nexus_sorcerer": "Promote a Mage.", // Nexus Sorcerer
  "catalyst_curator": "Promote a Mage.", // Catalyst Curator
  "leyline_invoker": "Promote a Mage.", // Leyline Invoker
  "frostbinder": "Promote a Mage.", // Frostbinder
  "barbarian_tyrant": "Promote a Fighter.", // Barbarian Tyrant
  "veteran_armsmaster": "Promote a Fighter.", // Veteran Armsmaster
  "defiant_adept": "Promote a Fighter.", // Defiant Adept
  "skirmish_captain": "Promote a Fighter.", // Skirmish Captain
  "wielder_of_night": "Promote an Assassin.", // Wielder of Night
  "blight_phantom": "Promote an Assassin.", // Blight Phantom
  "high_seas_captain": "Promote a Plunderer.", // High Seas Captain
  "corsair_saboteur": "Promote a Plunderer.", // Corsair Saboteur
  "grandfather_mystic": "Promote a Sage.", // Grandfather Oracle
  "frenzied_burster": "Promote a Basic Unit.", // Frenzied Burster
  "giant_boar": "Tribute 2.", // Giant Boar
  "siege_mammoth": "Tribute 2.", // Siege Mammoth
  "savage_grizzly": "Tribute 2.", // Savage Grizzly
  "spitfire_drake": "Tribute 2.", // Spitfire Drake
  "tempest_roc": "Tribute 2.", // Tempest Roc
  "corrosive_wyvern": "Tribute 2.", // Corrosive Wyvern
  "carapace_crusher": "Tribute 2.", // Carapace Crusher
  "octopod_titan": "Tribute 2.", // Octopod Titan
  "marsh_hydra": "Tribute 2.", // Marsh Hydra
  "gateway_guardians": "Fusion: 2 Knights.", // Gateway Guardians
  "drakerider_paladin": "Fusion: 2 Knights.", // Drakerider Paladin
  "animus_twin": "Fusion: 2 Mages.", // Animus Twin
  "starburst_wizard": "Fusion: 2 Mages.", // Starburst Wizard
  "dawnglow_archer": "Fusion: 2 Fighters.", // Dawnglow Archer
  "breaker_swordsman": "Fusion: 2 Fighters.", // Breaker Swordsman
  "blade_singer": "Fusion: 2 Mages and/or Fighters.", // Blade Singer
  "gemstone_paladin": "Fusion: 2 Mages and/or Knights.", // Gemstone Paladin
  "hexbinder": "Fusion: 2 Mages and/or Assassins.", // Hexbinder
  "lobber_gang": "Fusion: 2 Fighters and/or Plunderers.", // Lobber Gang
  "blind_seer": "Fusion: 2 Fighters and/or Sages.", // Blind Seer
  "shadowguard": "Fusion: 2 Knights and/or Assassins.", // Shadowguard
  "dreadnought_privateer": "Fusion: 2 Knights and/or Plunderers.", // Dreadnought Privateer
  "magnetic_marauder": "Fusion: 1 Mage + 1 Plunderer.", // Magnetic Marauder
  "harsh_inquisitor": "Fusion: 1 Mage + 1 Assassin.", // Harsh Inquisitor
  "heavy_cannoneer": "Fusion: 1 Knight + 1 Plunderer.", // Heavy Cannoneer
  "prismatic_pikemen": "Fusion: 1 Fighter + 1 Mage.", // Prismatic Pikemen
  "codex_defender": "Fusion: 1 Knight + 1 Sage.", // Codex Defender
  "sparring_partners": "Fusion: 1 Fighter + 1 Knight.", // Sparring Partners
  "elite_sniper": "Fusion: 1 Assassin + 1 Fighter.", // Elite Sniper
  "warden_of_the_gate": "Fusion: 1 Knight + 1 Sage.", // Warden of the Gate
  "simian_sovereign": "Tribute 3.", // Simian Sovereign
  "cannon_squadron": "Fusion: 3 Knights and/or Plunderers.", // Cannon Squadron
  "anima_magi": "Fusion: 3 Mages and/or Sages.", // Anima Magi
  "renegade_trio": "Fusion: 3 Fighters and/or Assassins.", // Renegade Trio
  "faceless_king": "Fusion: 3 Basic Units.", // Faceless King
  "the_cyclotron": "Fusion: 3 Cooks, Engineers, Campers, and/or Correspondents.", // The Cyclotron

  // ---- Wrath of the Elements ----
  "frozen_knight": "Basic Unit.", // Frozen Knight
  "frozen_fighter": "Basic Unit.", // Frozen Fighter
  "frozen_lancer": "Basic Unit.", // Frozen Lancer
  "frozen_golem": "Basic Unit.", // Frozen Golem
  "frozen_wildcat": "Basic Unit.", // Frozen Wildcat
  "flaming_fighter": "Basic Unit.", // Flaming Fighter
  "flaming_mage": "Basic Unit.", // Flaming Mage
  "flaming_salamander": "Basic Unit.", // Flaming Salamander
  "flaming_drakeling": "Basic Unit.", // Flaming Drakeling
  "flaming_ooze": "Basic Unit.", // Flaming Ooze
  "plant_mage": "Basic Unit.", // Plant Mage
  "plant_knight": "Basic Unit.", // Plant Knight
  "plant_lasher": "Basic Unit.", // Plant Lasher
  "noxious_plant": "Basic Unit.", // Noxious Plant
  "jaw_plant": "Basic Unit.", // Jaw Plant
  "abominable_snowman": "Promote a Frozen.", // Abominable Snowman
  "frostbreath_howler": "Promote a Frozen.", // Frostbreath Howler
  "burning_rager": "Promote a Flaming.", // Burning Rager
  "lava_elemental": "Promote a Flaming.", // Lava Elemental
  "hungering_overgrowth": "Promote a Plant.", // Hungering Overgrowth
  "seed_bombardier": "Promote a Plant.", // Seed Bombardier
  "voracious_firemaw": "Tribute 2: At least 1 Flaming.", // Voracious Firemaw
  "bonechiller_greatwurm": "Tribute 2: At least 1 Frozen.", // Bonechiller Greatwurm
  "lumbering_treeback": "Tribute 2: At least 1 Plant.", // Lumbering Treeback
  "canyonguard_iceberg": "Fusion: 2 Frozen.", // Canyonguard Iceberg
  "volcanic_tyrant": "Fusion: 2 Flaming.", // Volcanic Tyrant
  "elder_pine_treant": "Fusion: 2 Plant.", // Elder Pine Treant
  "direfrost_spectre": "Fusion: 1 Frozen + 1 Assassin.", // Direfrost Spectre
  "firebrand_raider": "Fusion: 1 Flaming + 1 Plunderer.", // Firebrand Raider
  "spore_mystic": "Fusion: 1 Plant + 1 Sage.", // Spore Mystic

  // ---- Fury of the Skies ----
  "nimbus_mage": "Basic Unit.", // Nimbus Mage
  "nimbus_assassin": "Basic Unit.", // Nimbus Assassin
  "nimbus_drakeling": "Basic Unit.", // Nimbus Drakeling
  "frozen_nimbus": "Basic Unit.", // Frozen Nimbus
  "flaming_nimbus": "Basic Unit.", // Flaming Nimbus
  "lightning_fighter": "Basic Unit.", // Lightning Fighter
  "lightning_plant": "Basic Unit.", // Lightning Plant
  "lightning_assassin": "Basic Unit.", // Lightning Assassin
  "lightning_wildcat": "Basic Unit.", // Lightning Wildcat
  "lightning_ooze": "Basic Unit.", // Lightning Ooze
  "lunar_assassin": "Basic Unit.", // Lunar Assassin
  "lunar_lancer": "Basic Unit.", // Lunar Lancer
  "lunar_wildcat": "Basic Unit.", // Lunar Wildcat
  "solar_knight": "Basic Unit.", // Solar Knight
  "solar_drakeling": "Basic Unit.", // Solar Drakeling
  "solar_lancer": "Basic Unit.", // Solar Lancer
  "toxic_ooze": "Basic Unit.", // Toxic Ooze
  "storm_rogue": "Promote an Assassin.", // Storm Rogue
  "overcharged_rootnexus": "Promote a Plant.", // Overcharged Rootnexus
  "fulgur_scale_skywyrm": "Promote a Drakeling.", // Fulgur-Scale Skywyrm
  "firebrand_wingserpent": "Promote a Drakeling.", // Firebrand Wingserpent
  "zenith_charger": "Promote a Lancer.", // Zenith Charger
  "boastful_champion": "Promote a Lancer.", // Boastful Champion
  "eclipse_prowler": "Promote a Wildcat.", // Eclipse Prowler
  "jungle_stalker": "Promote a Wildcat.", // Jungle Stalker
  "caustic_terror_slime": "Promote an Ooze.", // Caustic Terror-Slime
  "great_gel_prism": "Promote an Ooze.", // Great Gel Prism
  "feverish_manifestation": "Promote a Flaming.", // Feverish Manifestation
  "glacial_monolith": "Promote a Frozen.", // Glacial Monolith
  "moons_acolyte": "Promote a Lunar.", // Moon's Acolyte
  "full_moon_strider": "Promote a Lunar.", // Full-Moon Strider
  "brightwing_phoenix": "Promote a Solar.", // Brightwing Phoenix
  "shimmering_bulwark": "Promote a Solar.", // Shimmering Bulwark
  "master_of_weather": "Fusion: 1 Lightning + 1 Solar.", // Master of Weather
  "gelatinous_blimp": "Fusion: 1 Nimbus + 1 Ooze.", // Gelatinous Blimp
  "rimewind_direwyrm": "Fusion: 1 Drakeling + 1 Frozen.", // Rimewind Direwyrm
  "biogenic_mass": "Fusion: 1 Ooze + 1 Plant.", // Biogenic Mass
  "zigzag_cavalry": "Fusion: 1 Lancer + 1 Lightning.", // Zigzag Cavalry
  "arbiter_of_transience": "Fusion: 1 Solar + 1 Lunar.", // Arbiter of Transience
  "rampant_weretiger": "Fusion: 1 Lunar + 1 Wildcat.", // Rampant Weretiger
  "tempest_incarnate": "Fusion: 2 Lightning.", // Tempest Incarnate
  "blustering_gale_spirit": "Fusion: 2 Nimbus.", // Blustering Gale Spirit
  "pride_leader_lioness": "Fusion: 2 Wildcat.", // Pride Leader Lioness
  "primal_elder_drake": "Fusion: 2 Drakeling.", // Primal Elder Drake
  "sunborn_hierarch": "Fusion: 2 Solar.", // Sunborn Hierarch
  "nightruler_cobra": "Fusion: 2 Lunar.", // Nightruler Cobra
  "double_dragoon": "Fusion: 2 Lancer.", // Double Dragoon
  "phalanx_greatooze": "Fusion: 2 Ooze.", // Phalanx Greatooze
  "radiant_shine_avatar": "Tribute 3: At least 1 Solar + 1 Knight.", // Radiant Shine Avatar
  "serene_glow_avatar": "Tribute 3: At least 1 Lunar + 1 Assassin.", // Serene Glow Avatar

  // ---- Soul Festival 2026 ----
  "skeleton_fighter": "Basic Unit.", // Skeleton Fighter
  "skeleton_drakeling": "Basic Unit.", // Skeleton Drakeling
  "skeleton_sage": "Basic Unit.", // Skeleton Sage
  "calcified_skeleton": "Basic Unit.", // Calcified Skeleton
  "skeleton_archer": "Basic Unit.", // Skeleton Archer
  "arcane_skeleton": "Basic Unit.", // Arcane Skeleton
  "ghost_knight": "Basic Unit.", // Ghost Knight
  "ghost_plunderer": "Basic Unit.", // Ghost Plunderer
  "ghost_assassin": "Basic Unit.", // Ghost Assassin
  "vindictive_ghost": "Basic Unit.", // Vindictive Ghost
  "ghost_terrifier": "Basic Unit.", // Ghost Terrifier
  "ghost_bruiser": "Basic Unit.", // Ghost Bruiser
  "alien_mage": "Basic Unit.", // Alien Mage
  "alien_ooze": "Basic Unit.", // Alien Ooze
  "alien_wildcat": "Basic Unit.", // Alien Wildcat
  "frozen_alien_invader": "Basic Unit.", // Frozen Alien Invader
  "predatory_alien": "Basic Unit.", // Predatory Alien
  "alien_triblade": "Basic Unit.", // Alien Triblade
  "conjured_bonelord": "Promote a Skeleton.", // Conjured Bonelord
  "clammering_bone_serpent": "Promote a Skeleton.", // Clammering Bone Serpent
  "wailing_revenant": "Promote a Ghost.", // Wailing Revenant
  "cackling_puppeteer": "Promote a Ghost.", // Cackling Puppeteer
  "assault_lander": "Promote an Alien.", // Assault Lander
  "soundwave_shock_trooper": "Promote an Alien.", // Soundwave Shock Trooper
  "ossified_direwyrm": "Fusion: 1 Skeleton + 1 Drakeling.", // Ossified Direwyrm
  "deadly_brain_symbiote": "Fusion: 1 Alien + 1 Ooze.", // Deadly Brain Symbiote
  "terrifying_executioner": "Fusion: 1 Assassin + 1 Ghost.", // Terrifying Executioner
  "skull_union_monarchy": "Fusion: 2 Skeletons + 1 Basic Unit.", // Skull-Union Monarchy
  "tally_ho_laser_squad": "Fusion: 2 Aliens + 1 Basic Unit.", // Tally-Ho Laser Squad
  "revenant_trio": "Fusion: 2 Ghosts + 1 Basic Unit.", // Revenant Trio

  // ---- Rival Kingdoms ----
  "western_wind_avatar": "Tribute 3: At least 1 Lancer + 1 Nimbus.", // Western Wind Avatar
  "crimson_dusk_avatar": "Tribute 3: At least 1 Fighter + 1 Flaming.", // Crimson Dusk Avatar
  "endothermic_geo_vent_avatar": "Tribute 3: At least 1 Alien + 1 Frozen.", // Endothermic Geo-Vent Avatar
  "cruel_maelstrom_avatar": "Tribute 3: At least 1 Mage + 1 Lightning.", // Cruel Maelstrom Avatar

  // ---- Flutter of Fairies ----
  "catalytic_fairy": "Basic Unit.", // Catalytic Fairy
  "reverberant_fairy": "Basic Unit.", // Reverberant Fairy
  "nimble_fairy": "Basic Unit.", // Nimble Fairy
  "bolstering_fairy": "Basic Unit.", // Bolstering Fairy
  "lucrative_fairy": "Basic Unit.", // Lucrative Fairy
  "restorative_fairy": "Basic Unit.", // Restorative Fairy
  "foresighted_fairy": "Basic Unit.", // Foresighted Fairy

  // ---- Bridging the Gap ----
  "solar_warden": "Basic Unit.", // Solar Warden
  "solar_mage": "Basic Unit.", // Solar Mage
  "lunar_serpent": "Basic Unit.", // Lunar Serpent
  "lunar_sage": "Basic Unit.", // Lunar Sage
  "musket_plunderer": "Basic Unit.", // Musket Plunderer
  "boathook_plunderer": "Basic Unit.", // Boathook Plunderer
  "quartermaster_plunderer": "Basic Unit.", // Quartermaster Plunderer
  "clown_assassin": "Basic Unit.", // Clown Assassin
  "nimbus_lancer": "Basic Unit.", // Nimbus Lancer
  "shield_lancer": "Basic Unit.", // Shield Lancer
  "phalanx_lancer": "Basic Unit.", // Phalanx Lancer
  "sloshing_ooze": "Basic Unit.", // Sloshing Ooze
  "lightning_mage": "Basic Unit.", // Lightning Mage
  "solar_plunderer": "Basic Unit.", // Solar Plunderer
  "lunar_vigilante": "Basic Unit.", // Lunar Vigilante
  "corrosive_ooze": "Basic Unit.", // Corrosive Ooze
  "carrion_drakeling": "Basic Unit.", // Carrion Drakeling
  "sootscreen_drakeling": "Basic Unit.", // Sootscreen Drakeling
  "stalking_wildcat": "Basic Unit.", // Stalking Wildcat
  "packhunter_wildcat": "Basic Unit.", // Packhunter Wildcat
  "chain_whip_fighter": "Basic Unit.", // Chain Whip Fighter
  "surveying_sage": "Basic Unit.", // Surveying Sage
  "javelin_knight": "Basic Unit.", // Javelin Knight
  "prismatic_mage": "Basic Unit.", // Prismatic Mage
  "ray_gun_assassin": "Basic Unit.", // Ray Gun Assassin
  "bosun_plunderer": "Basic Unit.", // Bosun Plunderer
  "tonfa_fighter": "Basic Unit.", // Tonfa Fighter
  "arbalest_knight": "Basic Unit.", // Arbalest Knight
};
