import { CardsDataSchema } from '../types/card';
import { annotateEffectSources } from '../utils/effectSources';

export const initialCardsData: CardsDataSchema = {
  "schemaVersion": 1,
  "scriptNotes": "Items with a 'script' key do something the app does not handle yet. script=null means not written yet: the engine falls back to 'effects' as the spec. A non-null script replaces 'effects' for that item. Abilities without a 'script' key are handled by the app already (damage and units gaining armour on themselves).",
  "universalActions": [
    {
      "id": "draw",
      "name": "Draw",
      "cost": 1,
      "limits": {
        "oncePerTurn": true,
      },
      "text": "Draw 1 card.",
      "effects": [
        {
          "type": "draw",
          "amount": 1
        }
      ],
      "script": null
    },
    {
      "id": "move",
      "name": "Move",
      "cost": 1,
      "text": "Choose one of the empty tiles surrounding this unit. This unit is now placed on that tile.",
      "effects": [
        {
          "type": "move",
          "target": "self",
          "tile": "chosenEmptySurrounding"
        }
      ],
      "script": null
    }
  ],
  "tokens": [
    {
      "id": "obstructing_wall",
      "name": "Obstructing Wall",
      "hp": 12,
      "ap": 0,
      "isWall": true,
      "passives": [],
      "abilities": [],
      "art": "art/tokens/obstructing_wall.png"
    },
    {
      "id": "raging_bonfire",
      "name": "Raging Bonfire",
      "hp": 12,
      "ap": 0,
      "art": "art/tokens/raging_bonfire.png",
      "passives": [
        {
          "id": "blazing_fixture",
          "name": "Blazing Fixture",
          "trigger": "static",
          "text": "This unit cannot move. For as long as this unit is in play, all tiles surrounding it are scorched (units moving onto or off of a scorched tile take 4 damage).",
          "effects": [
            {
              "type": "cannotMove",
              "target": "self"
            },
            {
              "type": "scorchTiles",
              "tiles": "surroundingSelf",
              "damage": 4
            }
          ],
          "script": null
        }
      ],
      "abilities": []
    },
    {
      "id": "toadstool",
      "name": "Toadstool",
      "hp": 8,
      "ap": 0,
      "art": "art/tokens/toadstool.png",
      "passives": [],
      "abilities": []
    },
    {
      "id": "freak",
      "name": "Freak",
      "hp": 12,
      "ap": 2,
      "art": "art/tokens/freak.png",
      "passives": [
        {
          "id": "mindless",
          "name": "Mindless",
          "trigger": "static",
          "text": "This unit cannot use the Universal Draw Action.",
          "effects": [
            {
              "type": "cannotUse",
              "action": "universalDrawAction",
              "target": "self"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "explode",
          "name": "Explode",
          "cost": 1,
          "text": "Deals damage equal to this unit's remaining HP to itself and all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "perRemainingHealth": 1
              },
              "hits": 1,
              "area": "selfAndAllUnitsSurroundingSelf"
            }
          ]
        }
      ]
    },
    {
      "id": "apparition",
      "name": "Apparition",
      "hp": 8,
      "ap": 2,
      "art": "art/tokens/apparition.png",
      "passives": [],
      "abilities": [
        {
          "id": "spooky_attack",
          "name": "Spooky Attack",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            }
          ]
        }
      ]
    }
  ],
  "cards": [
    {
      "id": "sentinel_knight", "set": "Realms of Man",
      "name": "Sentinel Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 21,
      "ap": 2,
      "art": "art/sentinel_knight.png",
      "passives": [
        {
          "id": "steadfast",
          "name": "Steadfast",
          "trigger": "static",
          "text": "This unit cannot be knocked back while armoured.",
          "effects": [
            {
              "type": "immune",
              "to": "knockback",
              "target": "self",
              "if": "self.hasArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "guards_strike",
          "name": "Guard's Strike",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage. If this unit is armoured, this attack deals an additional 2 damage (on the first hit).",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "if": "self.hasArmour",
                  "addAmount": 2,
                  "scope": "firstHit"
                }
              ]
            }
          ]
        },
        {
          "id": "rally_stance",
          "name": "Rally Stance",
          "cost": 1,
          "tags": [
            "inspiring"
          ],
          "text": "Armour up to 4. A friendly unit surrounding this one may also armour up to 3.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 4
            },
            {
              "type": "armour",
              "target": "friendlySurroundingSelf",
              "count": 1,
              "optional": true,
              "upTo": 3
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Knight"
      ]
    },
    {
      "id": "topaz_mage",
      "set": "Realms of Man",
      "name": "Topaz Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 13,
      "ap": 2,
      "art": "art/topaz_mage.png",
      "passives": [
        {
          "id": "humming_barrier",
          "name": "Humming Barrier",
          "trigger": "turnStart",
          "text": "At the start of each turn, armour up to 2.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "twinbolt",
          "name": "Twinbolt",
          "cost": 1,
          "range": [
            1,
            3
          ],
          "target": "unit",
          "text": "Deals 2 damage. If this attack has already been used this turn, deals 3 damage instead. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 2,
              "modifiers": [
                {
                  "if": "thisAbilityUsedEarlierThisTurn",
                  "setAmount": 3
                }
              ]
            }
          ],
          "rangeText": "1-3"
        },
        {
          "id": "deadly_arc",
          "name": "Deadly Arc",
          "cost": 2,
          "range": [
            1,
            2
          ],
          "target": "unit",
          "text": "Deals 10 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit (they must choose a different non-token unit if able).",
          "effects": [
            {
              "type": "damage",
              "amount": 10,
              "hits": 1
            },
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "if": "target.tookLastTurn",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ],
          "script": null,
          "rangeText": "2"
        }
      ],
      "classTags": [
        "Mage"
      ]
    },
    {
      "id": "duelist_fighter",
      "set": "Realms of Man",
      "name": "Duelist Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/duelist_fighter.png",
      "passives": [
        {
          "id": "obscuring_cloak",
          "name": "Obscuring Cloak",
          "trigger": "static",
          "text": "This unit takes 1 less damage from each melee attack.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "meleeAttack",
              "per": "attack"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "ready_stance",
          "name": "Ready Stance",
          "cost": 1,
          "tags": [
            "react",
            "inspiring"
          ],
          "text": "The next time this unit becomes the target of a melee attack during your opponent's next turn, prevent up to 7 damage to this unit. If you do, this unit deals up to that much damage to the attacker. Do this as a react effect.",
          "effects": [
            {
              "type": "setReact",
              "duration": "opponentNextTurn",
              "once": true,
              "trigger": "self.targetedByMeleeAttack",
              "effects": [
                {
                  "type": "preventDamage",
                  "target": "self",
                  "upTo": 7
                },
                {
                  "type": "damage",
                  "target": "attacker",
                  "amount": "preventedAmount",
                  "if": "damagePrevented"
                }
              ]
            },
            {
              "type": "endTurn",
              "target": "self"
            }
          ],
          "script": null
        },
        {
          "id": "rapid_thrust",
          "name": "Rapid Thrust",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ]
        }
      ],
      "classTags": [
        "Fighter"
      ]
    },
    {
      "id": "shade_assassin", "set": "Realms of Man",
      "name": "Shade Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/shade_assassin.png",
      "passives": [
        {
          "id": "backstab",
          "name": "Backstab",
          "trigger": "static",
          "text": "This unit deals an additional 4 damage on the first hit of any attack made from the tile behind the target.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 4,
              "scope": "firstHit",
              "if": "selfOnTileBehindTarget"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "shade_step",
          "name": "Shade Step",
          "cost": 1,
          "range": [1, 3],
          "target": "emptyTile",
          "text": "Place this unit on the target tile.",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target"
            }
          ],
          "script": null,
          "rangeText": "1-3",
          "targetText": "empty tile target"
        },
        {
          "id": "plunge_and_twist",
          "name": "Plunge and Twist",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage. Then, if the target has no armour, this attack hits again to deal 3 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "extraHit": {
                "amount": 3,
                "if": "target.noArmour",
                "checkedAfterHit": 1
              }
            }
          ]
        }
      ],
      "classTags": [
        "Assassin"
      ]
    },
    {
      "id": "archivist_sage",
      "set": "Realms of Man",
      "name": "Archivist Sage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/archivist_sage.png",
      "passives": [
        {
          "id": "rapid_catalog",
          "name": "Rapid Catalog",
          "trigger": "static",
          "text": "When this unit uses the universal Draw action, instead you may look at the top 2 cards of your deck. Put one into your hand and the other on the bottom of your deck.",
          "effects": [
            {
              "type": "replace",
              "replaces": "universalDrawAction",
              "optional": true,
              "with": [
                {
                  "type": "lookTop",
                  "count": 2,
                  "toHand": 1,
                  "restTo": "bottomOfDeck"
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "deep_research",
          "name": "Deep Research",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Look at the top 2 cards of your deck. Put one into your hand and the other on the bottom of your deck. Use only once per turn.",
          "effects": [
            {
              "type": "lookTop",
              "count": 2,
              "toHand": 1,
              "restTo": "bottomOfDeck"
            }
          ],
          "script": null
        },
        {
          "id": "quarterstaff_slam",
          "name": "Quarterstaff Slam",
          "cost": 2,
          "tags": [
            "melee"
          ],
          "text": "Deals 9 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 9,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Sage"
      ]
    },
    {
      "id": "powder_keg_plunderer", "set": "Realms of Man",
      "name": "Powder Keg Plunderer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/powder_keg_plunderer.png",
      "passives": [
        {
          "id": "short_fuse",
          "name": "Short Fuse",
          "trigger": "self.dealsDamageWithAttack",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Once per turn, when this unit deals damage with an attack, Loot 2.",
          "effects": [
            {
              "type": "loot",
              "amount": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "fuse_lighter",
          "name": "Fuse Lighter",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ]
        },
        {
          "id": "powder_charge",
          "name": "Powder Charge",
          "cost": 2,
          "range": [1, 2],
          "target": "tile",
          "text": "Deals 7 damage to units on the target tile and 3 damage to each unit surrounding it.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "surroundingTargetTile"
            }
          ],
          "rangeText": "2",
          "targetText": "targets tile"
        }
      ],
      "classTags": [
        "Plunderer"
      ]
    },
    {
      "id": "combat_cook", "set": "Realms of Man",
      "name": "Combat Cook",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/combat_cook.png",
      "passives": [
        {
          "id": "feeding_frenzy",
          "name": "Feeding Frenzy",
          "trigger": "static",
          "text": "This unit may attack friendly units. If damage would be dealt to a unit this way, prevent that damage, then that unit heals up to that much damage instead.",
          "effects": [
            {
              "type": "allowTargeting",
              "attacker": "self",
              "targets": "friendlyUnits"
            },
            {
              "type": "replaceDamage",
              "source": "self",
              "to": "friendlyUnits",
              "with": {
                "type": "heal",
                "upTo": "preventedAmount"
              }
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "fried_eggs_a_la_carte",
          "name": "Fried Eggs à-la-carte",
          "cost": [1, 2],
          "range": [1, 2],
          "target": "unit",
          "text": "Deals 1 damage. Hits 4 times per AP spent.",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": {
                "perAP": 4
              }
            }
          ],
          "rangeText": "1-2"
        },
        {
          "id": "slops_on",
          "name": "Slop's On!",
          "cost": 1,
          "tags": [
            "melee",
            "assist"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 6 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Cook"
      ]
    },
    {
      "id": "battle_engineer", "set": "Realms of Man",
      "name": "Battle Engineer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/battle_engineer.png",
      "passives": [],
      "abilities": [
        {
          "id": "build_structure",
          "name": "Build Structure",
          "cost": 1,
          "range": [1, 1],
          "rangeText": "1",
          "target": "emptyTile",
          "targetText": "empty surrounding tile",
          "tags": [
            "inspiring"
          ],
          "text": "If you have no Obstructing Wall token in play, create one on an empty surrounding tile (it is a token with 12HP, 0AP, and no abilities).",
          "effects": [
            {
              "type": "createToken",
              "token": "obstructing_wall",
              "tile": "chosenEmptySurrounding",
              "if": "noFriendlyToken:obstructing_wall"
            }
          ],
          "script": null
        },
        {
          "id": "reinforce_structure",
          "name": "Reinforce Structure",
          "cost": 1,
          "range": [1, 1],
          "target": "obstructingWall",
          "text": "The target unit gains 6 armour to a limit of 18 armour.",
          "effects": [
            {
              "type": "armour",
              "target": "target",
              "amount": 6,
              "cap": 18
            }
          ],
          "script": null,
          "rangeText": "1",
          "targetText": "only target an Obstructing Wall"
        },
        {
          "id": "discharge_battery",
          "name": "Discharge Battery",
          "cost": 1,
          "range": [1, 1],
          "target": "unit",
          "text": "Deals 2 damage. Hits 3 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3
            }
          ],
          "rangeText": "1"
        }
      ],
      "classTags": [
        "Engineer"
      ]
    },
    {
      "id": "conflict_correspondent",
      "set": "Realms of Man",
      "name": "Conflict Correspondent",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 14,
      "ap": 2,
      "art": "art/conflict_correspondent.png",
      "passives": [
        {
          "id": "embedded_press",
          "name": "Embedded Press",
          "trigger": "enemyUnitTakesDamageWithinRange:2",
          "limits": {
            "oncePerTurn": true
          },
          "text": "The first time each turn an enemy unit takes damage within range 2 of this unit, draw 1 card.",
          "effects": [
            {
              "type": "draw",
              "amount": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "field_notes",
          "name": "Field Notes",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "text": "Reveal the top card of either player's deck. You may put that card on the bottom of their deck.",
          "effects": [
            {
              "type": "revealTop",
              "deck": "eitherPlayer",
              "then": {
                "type": "putBottom",
                "optional": true
              }
            }
          ],
          "script": null
        },
        {
          "id": "broaden_search",
          "name": "Broaden Search",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "range": [
            1,
            3
          ],
          "target": "friendlyUnit",
          "text": "The target unit may use abilities this turn as though they had an additional 1 range.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "target",
              "amount": 1,
              "appliesTo": "abilities",
              "duration": "thisTurn"
            }
          ],
          "script": null,
          "rangeText": "1-3"
        },
        {
          "id": "pointed_questioning",
          "name": "Pointed Questioning",
          "cost": 1,
          "range": [
            1,
            4
          ],
          "rangeText": "1-4",
          "target": "unit",
          "text": "Deals 1 damage. Hits 4 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 4
            }
          ]
        }
      ],
      "classTags": [
        "Correspondent"
      ]
    },
    {
      "id": "happy_camper",
      "set": "Realms of Man",
      "name": "Happy Camper",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/happy_camper.png",
      "passives": [
        {
          "id": "trailblazer",
          "name": "Trailblazer",
          "trigger": "static",
          "text": "This unit does not take damage from moving onto or off of scorched tiles.",
          "effects": [
            {
              "type": "immune",
              "to": "scorchedTileDamage",
              "target": "self"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "pitch_camp",
          "name": "Pitch Camp",
          "cost": 1,
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "target": "emptyTile",
          "targetText": "empty surrounding tile",
          "tags": [
            "inspiring"
          ],
          "text": "If you have no Raging Bonfire token in play, create one on an empty surrounding tile (It is a token with 12HP, 0AP, and Passive- Blazing Fixture).",
          "effects": [
            {
              "type": "createToken",
              "token": "raging_bonfire",
              "tile": "chosenEmptySurrounding",
              "if": "noFriendlyToken:raging_bonfire"
            }
          ],
          "script": null
        },
        {
          "id": "red_hot_skewer",
          "name": "Red-Hot Skewer",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        },
        {
          "id": "roast_a_marshmallow",
          "name": "Roast a Marshmallow",
          "cost": 1,
          "limits": {
            "oncePerTurn": true
          },
          "text": "This unit heals 2 damage. If it is surrounding a Raging Bonfire, it heals 4 damage instead. Use only once per turn.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": 2,
              "modifiers": [
                {
                  "if": "self.surroundingToken:raging_bonfire",
                  "setAmount": 4
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Camper"
      ]
    },
    {
      "id": "imbued_knight", "set": "Realms of Man",
      "name": "Imbued Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 22,
      "ap": 2,
      "art": "art/imbued_knight.png",
      "passives": [
        {
          "id": "iron_foundation",
          "name": "Iron Foundation",
          "trigger": "static",
          "text": "If this unit would lose armour to damage from an attack that hits more than once, that attack deals 1 damage less on the first hit.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "scope": "firstHit",
              "if": "attackHitsMoreThanOnce && damageWouldRemoveArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "overhead_slam",
          "name": "Overhead Slam",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        },
        {
          "id": "heave_foe",
          "name": "Heave Foe",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 4 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "script": null
        },
        {
          "id": "fortress_stance",
          "name": "Fortress Stance",
          "cost": 1,
          "tags": [
            "react"
          ],
          "text": "Armour up to 4. Until the end of your opponent's next turn, reflect the next ranged attack that targets this unit.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 4
            },
            {
              "type": "setReact",
              "duration": "untilEndOfOpponentNextTurn",
              "once": true,
              "trigger": "self.targetedByRangedAttack",
              "effects": [
                {
                  "type": "reflect"
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Knight"
      ]
    },
    {
      "id": "polearm_knight",
      "set": "Realms of Man",
      "name": "Polearm Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 22,
      "ap": 2,
      "art": "art/polearm_knight.png",
      "passives": [
        {
          "id": "iron_foundation",
          "name": "Iron Foundation",
          "trigger": "static",
          "text": "If this unit would lose armour to damage from an attack that hits more than once, that attack deals 1 damage less on the first hit.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "scope": "firstHit",
              "if": "attackHitsMoreThanOnce && damageWouldRemoveArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "bludgeon",
          "name": "Bludgeon",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        },
        {
          "id": "rip_and_tear",
          "name": "Rip and Tear",
          "cost": 2,
          "tags": [
            "melee",
            "inspiring"
          ],
          "text": "Remove all armour from the target, then deal 7 damage. Then, if no armour was removed this way, deal 5 damage (as an additional hit).",
          "effects": [
            {
              "type": "removeArmour",
              "target": "target",
              "amount": "all"
            },
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "extraHit": {
                "amount": 5,
                "if": "noArmourWasRemoved",
                "checkedAfterHit": 1
              }
            }
          ],
          "script": null
        },
        {
          "id": "bulwark_stance",
          "name": "Bulwark Stance",
          "cost": 1,
          "text": "Armour up to 5.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 5
            }
          ]
        }
      ],
      "classTags": [
        "Knight"
      ]
    },
    {
      "id": "greatsword_knight",
      "set": "Realms of Man",
      "name": "Greatsword Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 22,
      "ap": 2,
      "art": "art/greatsword_knight.png",
      "passives": [
        {
          "id": "immovable",
          "name": "Immovable",
          "trigger": "static",
          "text": "Immune to knockback effects.",
          "effects": [
            {
              "type": "immune",
              "to": "knockback",
              "target": "self"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "greatcleave",
          "name": "Greatcleave",
          "cost": 1,
          "tags": [
            "melee",
            "inspiring"
          ],
          "target": "surroundingEnemyUnits",
          "targetCount": {
            "max": 3
          },
          "text": "Deals 6 damage. For each target beyond the first, this attack deals 1 damage less.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "modifiers": [
                {
                  "addAmount": {
                    "perTarget": -1
                  }
                }
              ]
            }
          ],
          "targetText": "target up to 3 surrounding enemy units"
        },
        {
          "id": "brace_blade",
          "name": "Brace Blade",
          "cost": 1,
          "text": "Armour up to 4.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 4
            }
          ]
        }
      ],
      "classTags": [
        "Knight"
      ]
    },
    {
      "id": "longbow_knight", "set": "Realms of Man",
      "name": "Longbow Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/longbow_knight.png",
      "passives": [
        {
          "id": "vanguard_armour",
          "name": "Vanguard Armour",
          "trigger": "static",
          "text": "Takes 3 damage less per attack from ranged attacks, to a minimum of 1 damage per attack.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 3,
              "target": "self",
              "from": "rangedAttack",
              "per": "attack",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "stave_off",
          "name": "Stave Off",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        },
        {
          "id": "heavy_shot",
          "name": "Heavy Shot",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "range": [2, 3],
          "rangeText": "2-3",
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 8 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            }
          ]
        },
        {
          "id": "block_stance",
          "name": "Block Stance",
          "cost": 1,
          "text": "Armour up to 4.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 4
            }
          ]
        }
      ],
      "classTags": [
        "Knight"
      ]
    },
    {
      "id": "bastion_knight",
      "set": "Realms of Man",
      "name": "Bastion Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/bastion_knight.png",
      "passives": [
        {
          "id": "absolute_fortitude",
          "name": "Absolute Fortitude",
          "trigger": "static",
          "text": "If this unit would lose armour from damage, first reduce the damage by 1 to a minimum of 1 damage.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "minDamage": 1,
              "if": "damageWouldRemoveArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "shove_off",
          "name": "Shove Off",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 2 damage. Knockback 1. If this unit has already used this attack on the target this turn, deals an additional 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "modifiers": [
                {
                  "if": "thisAbilityUsedOnTargetEarlierThisTurn",
                  "addAmount": 5
                }
              ]
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "script": null
        },
        {
          "id": "impenetrable_bastion",
          "name": "Impenetrable Bastion",
          "cost": 1,
          "text": "Armour up to 6.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 6
            }
          ]
        }
      ],
      "classTags": [
        "Knight"
      ]
    },
    {
      "id": "euclase_mage", "set": "Realms of Man",
      "name": "Euclase Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 14,
      "ap": 2,
      "art": "art/euclase_mage.png",
      "passives": [
        {
          "id": "ice_layer",
          "name": "Ice Layer",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "glacial_spikes",
          "name": "Glacial Spikes",
          "cost": [1, 2],
                    "tags": [],
          "usesPath": true,
          "pathRule": "straight",
          "target": "tile",
          "range": [1, 3],
          "rangeText": "3",
          "text": "Deals 5 damage per AP spent to all enemy units along the path.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "perAP": 5
              },
              "hits": 1,
              "area": "enemyUnitsAlongPath"
            }
          ]
        },
        {
          "id": "cold_feet",
          "name": "Cold Feet",
          "cost": 2,
          "range": [1, 2],
          "rangeText": "1-2",
          "target": "unit",
          "text": "Deals 8 damage. If the target takes the next turn, moving costs an additional 1AP first time it moves that turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            },
            {
              "type": "increaseMoveCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstMoveOfTurn",
              "duration": "nextTurnIfTargetTakesIt"
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Mage"
      ]
    },
    {
      "id": "garnet_mage", "set": "Realms of Man",
      "name": "Garnet Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 13,
      "ap": 2,
      "art": "art/garnet_mage.png",
      "passives": [
        {
          "id": "tempered_aura",
          "name": "Tempered Aura",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "flame_blast",
          "name": "Flame Blast",
          "cost": 1,
          "range": [1, 3],
          "rangeText": "1-3",
          "target": "unit",
          "text": "Deals 5 damage. If the first unit hit by this attack each turn takes the next turn, that unit takes 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "delayedDamage",
              "target": "firstUnitHitByThisAbilityEachTurn",
              "amount": 4,
              "when": "targetTakesNextTurn"
            }
          ],
          "script": null
        },
        {
          "id": "exploding_fireball",
          "name": "Exploding Fireball",
          "cost": 2,
          "range": [1, 3],
          "rangeText": "1-3",
          "target": "tile",
          "text": "Deals 10 damage to units on the target tile and 5 damage to all units on surrounding tiles.",
          "effects": [
            {
              "type": "damage",
              "amount": 10,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "surroundingTargetTile"
            }
          ],
          "targetText": "targets tile"
        }
      ],
      "classTags": [
        "Mage"
      ]
    },
    {
      "id": "opal_mage", "set": "Realms of Man",
      "name": "Opal Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 14,
      "ap": 2,
      "art": "art/opal_mage.png",
      "passives": [
        {
          "id": "shell_armour",
          "name": "Shell Armour",
          "trigger": "multiple",
          "text": "At the start of each player's turn, armour up to 2. If this unit's armour is broken, once per attack, armour up to 1 after taking the damage.",
          "effects": [
            {
              "trigger": "turnStart",
              "type": "armour",
              "target": "self",
              "upTo": 2
            },
            {
              "trigger": "self.armourBroken",
              "limits": {
                "oncePerAttack": true
              },
              "timing": "afterDamage",
              "type": "armour",
              "target": "self",
              "upTo": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "bursting_bubbles",
          "name": "Bursting Bubbles",
          "cost": 1,
          "range": [1, 3],
          "rangeText": "1-3",
          "target": "unit",
          "text": "Deals 2 damage. Hits three times. If this unit has any damage on it, this attack hits only twice instead.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3,
              "modifiers": [
                {
                  "if": "self.hasDamage",
                  "setHits": 2
                }
              ]
            }
          ]
        },
        {
          "id": "roiling_whirlpool",
          "name": "Roiling Whirlpool",
          "cost": 2,
          "tags": [
            "assist"
          ],
          "range": [1, 1],
          "rangeText": "1",
          "target": "tile",
          "text": "Deals 5 damage to units on the target tile and all surrounding enemies. Then, for each enemy hit, heal 1 damage from this unit and all friendly units surrounding it.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "enemyUnitsSurroundingTargetTile"
            },
            {
              "type": "heal",
              "target": "selfAndFriendlyUnitsSurroundingSelf",
              "amount": {
                "perEnemyHit": 1
              }
            }
          ],
          "script": null,
          "targetText": "targets tile"
        }
      ],
      "classTags": [
        "Mage"
      ]
    },
    {
      "id": "dravite_mage",
      "set": "Realms of Man",
      "name": "Dravite Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/dravite_mage.png",
      "passives": [
        {
          "id": "earthen_shards",
          "name": "Earthen Shards",
          "trigger": "static",
          "text": "For every point of armour this unit would gain beyond 3, it deals 3 damage to surrounding enemy units instead.",
          "effects": [
            {
              "type": "replaceArmourGain",
              "beyond": 3,
              "with": {
                "type": "damage",
                "amount": 3,
                "per": "armourPoint",
                "area": "enemyUnitsSurroundingSelf"
              }
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "stone_wall",
          "name": "Stone Wall",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "emptyTile",
          "text": "If you have no Obstructing Wall token in play, create one on the target tile (It is a token with 12HP, 0AP, and no abilities).",
          "effects": [
            {
              "type": "createToken",
              "token": "obstructing_wall",
              "tile": "target",
              "if": "noFriendlyToken:obstructing_wall"
            }
          ],
          "script": null,
          "targetText": "empty tile target"
        },
        {
          "id": "boulder_hurl",
          "name": "Boulder Hurl",
          "cost": [
            1,
            2
          ],
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "text": "Deals 5 damage and gain 1 armour per AP spent.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "armour",
              "target": "self",
              "amount": {
                "perAP": 1
              }
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Mage"
      ]
    },
    {
      "id": "amethyst_mage", "set": "Realms of Man",
      "name": "Amethyst Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 13,
      "ap": 2,
      "art": "art/amethyst_mage.png",
      "passives": [
        {
          "id": "warding_sigil",
          "name": "Warding Sigil",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "phlox_shot",
          "name": "Phlox Shot",
          "cost": 1,
          "range": [1, 3],
          "rangeText": "1-3",
          "target": "unit",
          "text": "Deals 5 damage. Against an armoured target, deals an additional 2 damage (as a single hit).",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "if": "target.hasArmour",
                  "addAmount": 2,
                  "scope": "firstHit"
                }
              ]
            }
          ]
        },
        {
          "id": "arcane_surge",
          "name": "Arcane Surge",
          "cost": 2,
          "range": [1, 2],
          "rangeText": "1-2",
          "target": "unit",
          "text": "Deals 6 damage, bypassing armour. If the target was at full HP, this attack hits again for 4 damage (the second hit does not ignore armour).",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "bypassArmour": true,
              "extraHit": {
                "amount": 4,
                "if": "target.wasAtFullHpBeforeAttack",
                "bypassArmour": false,
                "checkedAfterHit": 1
              }
            }
          ]
        }
      ],
      "classTags": [
        "Mage"
      ]
    },
    {
      "id": "halberd_fighter",
      "set": "Realms of Man",
      "name": "Halberd Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/halberd_fighter.png",
      "passives": [
        {
          "id": "break_the_line",
          "name": "Break the Line",
          "trigger": "self.movedThroughUnit",
          "text": "After moving through a unit, this unit gains 2 armour.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "amount": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "cleave_and_tear",
          "name": "Cleave and Tear",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 4 damage, then hits again dealing 3 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "extraHit": {
                "amount": 3
              }
            }
          ]
        },
        {
          "id": "lead_the_charge",
          "name": "Lead the Charge",
          "cost": 2,
          "tags": [
            "melee",
            "inspiring"
          ],
          "text": "Deals 5 damage. This unit may move up to 2 tiles before declaring this attack, ignoring other units as long as the final tile is unoccupied. Moving through an enemy unit in this way deals 5 damage to that unit.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 2
              },
              "optional": true,
              "timing": "beforeDeclaringAttack",
              "ignoreUnits": true,
              "finalTileMustBeEmpty": true,
              "damageToEnemiesMovedThrough": 5
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Fighter"
      ]
    },
    {
      "id": "spear_fighter",
      "set": "Realms of Man",
      "name": "Spear Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/spear_fighter.png",
      "passives": [
        {
          "id": "momentum_charge",
          "name": "Momentum Charge",
          "trigger": "self.firstMoveOnOwnTurn",
          "text": "The first time this unit moves on its turn, it may move an additional tile in the same direction for free.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "extraTiles": 1,
              "direction": "same",
              "optional": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "hold_the_line",
          "name": "Hold the Line",
          "cost": 1,
          "text": "Armour up to 3.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ]
        },
        {
          "id": "deft_skewer",
          "name": "Deft Skewer",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "This attack deals an additional 1 damage if this unit has armour on it. Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "if": "self.hasArmour",
                  "addAmount": 1
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Fighter"
      ]
    },
    {
      "id": "crossbow_fighter", "set": "Realms of Man",
      "name": "Crossbow Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/crossbow_fighter.png",
      "passives": [
        {
          "id": "stopping_power",
          "name": "Stopping Power",
          "trigger": "static",
          "text": "When using Weighty Shot, if the unit hit is within range 1 of this unit, it deals an additional 3 damage.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ability:weighty_shot",
              "amount": 3,
              "if": "target.withinRange:1"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "jab_and_backstep",
          "name": "Jab and Backstep",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage. Move 1 tile for free after attacking.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "timing": "afterAttack"
            }
          ],
          "script": null
        },
        {
          "id": "weighty_shot",
          "name": "Weighty Shot",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "straightLine": true,
          "target": "direction",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 7 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "area": "firstUnitInStraightLine"
            }
          ],
          "targetText": "Choose a direction. Hits first unit in a straight line"
        }
      ],
      "classTags": [
        "Fighter"
      ]
    },
    {
      "id": "dual_sword_fighter",
      "set": "Realms of Man",
      "name": "Dual-Sword Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/dual_sword_fighter.png",
      "passives": [
        {
          "id": "bloodrush",
          "name": "Bloodrush",
          "trigger": "self.attackHits",
          "limits": {
            "firstAttackEachTurn": true
          },
          "text": "The first attack this unit uses each turn heals this unit 1 damage per hit.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": {
                "perHit": 1
              }
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "dual_spin",
          "name": "Dual Spin",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage. Then, hits again for 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": {
                "amount": 2
              }
            }
          ]
        },
        {
          "id": "frenzied_flurry",
          "name": "Frenzied Flurry",
          "cost": 2,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage. Hits 3 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 3
            }
          ]
        }
      ],
      "classTags": [
        "Fighter"
      ]
    },
    {
      "id": "brawl_fighter",
      "set": "Realms of Man",
      "name": "Brawl Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 19,
      "ap": 2,
      "art": "art/brawl_fighter.png",
      "passives": [
        {
          "id": "adrenaline",
          "name": "Adrenaline",
          "trigger": "static",
          "text": "If this unit has already taken damage this turn, its attacks deal an additional 2 damage per hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "if": "self.tookDamageThisTurn",
              "scope": "allHits"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "reckless_blow",
          "name": "Reckless Blow",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 7 damage. Then, this unit takes 1 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "damage",
              "target": "self",
              "amount": 1,
              "hits": 1
            }
          ],
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "gut_shot",
          "name": "Gut Shot",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Fighter"
      ]
    },
    {
      "id": "cutthroat_assassin", "set": "Realms of Man",
      "name": "Cutthroat Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/cutthroat_assassin.png",
      "passives": [
        {
          "id": "opportunist",
          "name": "Opportunist",
          "trigger": "static",
          "text": "This unit's melee attacks made from the tile behind the target deal an additional 1 damage per hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownMeleeAttacks",
              "amount": 1,
              "scope": "allHits",
              "if": "selfOnTileBehindTarget"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "do_em_up",
          "name": "Do 'Em Up",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 2 damage. Hits 4 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 4
            }
          ]
        },
        {
          "id": "deft_swipe",
          "name": "Deft Swipe",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 6 damage. If this attack is made from the tile behind the target, this unit may move 1 tile for free afterward.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true,
              "timing": "afterAttack",
              "if": "selfOnTileBehindTarget"
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Assassin"
      ]
    },
    {
      "id": "poisonblade_assassin", "set": "Realms of Man",
      "name": "Poisonblade Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/poisonblade_assassin.png",
      "passives": [
        {
          "id": "slow_venom",
          "name": "Slow Venom",
          "trigger": "self.damagesUnitWithAttack",
          "text": "A unit damaged by this unit's attacks (not counting damage dealt to armour) takes 4 damage at the start of your opponent's next turn. This effect does not stack.",
          "effects": [
            {
              "type": "applyStatus",
              "status": "slow_venom",
              "target": "damagedUnit",
              "ignoreArmourOnlyDamage": true,
              "stacks": false,
              "delayedDamage": {
                "amount": 4,
                "when": "startOfOpponentNextTurn"
              }
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "coated_edge",
          "name": "Coated Edge",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        },
        {
          "id": "coup_de_grace",
          "name": "Coup de Grace",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "If the target is currently affected by Slow Venom, this attack deals 10 damage. Otherwise, deals 1 damage, bypassing armour.",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 1,
              "bypassArmour": true,
              "modifiers": [
                {
                  "if": "target.hasStatus:slow_venom",
                  "setAmount": 10,
                  "setBypassArmour": false
                }
              ]
            }
          ]
        }
      ],
      "classTags": [
        "Assassin"
      ]
    },
    {
      "id": "blood_sage", "set": "Realms of Man",
      "name": "Blood Sage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/blood_sage.png",
      "passives": [
        {
          "id": "sanguine_offering",
          "name": "Sanguine Offering",
          "trigger": "self.takesDamage",
          "limits": {
            "oncePerPlayerTurn": true
          },
          "text": "Whenever this unit takes damage, draw 1 card. This may only happen once on each player's turn.",
          "effects": [
            {
              "type": "draw",
              "amount": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "profane_insight",
          "name": "Profane Insight",
          "cost": 1,
          "text": "Deals 1 damage to this unit.",
          "effects": [
            {
              "type": "damage",
              "target": "self",
              "amount": 1,
              "hits": 1
            }
          ]
        },
        {
          "id": "ritual_of_pain",
          "name": "Ritual of Pain",
          "cost": 1,
          "text": "Deals 4 damage to all surrounding enemy units. Heal this unit 1 damage for each damage dealt this way.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            },
            {
              "type": "heal",
              "target": "self",
              "amount": {
                "perDamageDealt": 1
              }
            }
          ],
          "script": null
        }
      ],
      "classTags": [
        "Sage"
      ]
    },
    {
      "id": "fateweaver_sage",
      "set": "Realms of Man",
      "name": "Fateweaver Sage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/fateweaver_sage.png",
      "passives": [
        {
          "id": "foresight",
          "name": "Foresight",
          "trigger": "self.takesTurn",
          "text": "When this unit takes a turn, look at the top card of your deck. You may put it on the bottom of your deck.",
          "effects": [
            {
              "type": "lookTop",
              "count": 1,
              "optionalToBottom": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "realm_warp",
          "name": "Realm Warp",
          "isMultiStage": true,
          "cost": 1,
          "tags": [
            "inspiring"
          ],
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "emptyTile",
          "text": "Place a unit surrounding the target tile onto the target tile. If it is a friendly unit, it armours up to 3.",
          "effects": [
            {
              "type": "place",
              "unit": "chosenUnitSurroundingTargetTile",
              "tile": "target"
            },
            {
              "type": "armour",
              "target": "placedUnit",
              "upTo": 3,
              "if": "placedUnit.isFriendly"
            }
          ],
          "script": null,
          "targetText": "empty tile target"
        },
        {
          "id": "withered_cane",
          "name": "Withered Cane",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Sage"
      ]
    },
    {
      "id": "swashbuckle_plunderer", "set": "Realms of Man",
      "name": "Swashbuckle Plunderer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/swashbuckle_plunderer.png",
      "passives": [
        {
          "id": "spoils",
          "name": "Spoils",
          "trigger": "self.dealsDamageWithAttack",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Once per turn, when this unit deals damage with an attack, Loot 2.",
          "effects": [
            {
              "type": "loot",
              "amount": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "cutlass_slash",
          "name": "Cutlass Slash",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        },
        {
          "id": "flintlock_repeater",
          "name": "Flintlock Repeater",
          "cost": 2,
          "range": [1, 2],
          "rangeText": "2",
          "target": "unit",
          "text": "Deals 5 damage. Hits 3 times. Armour blocks this attack without depleting (damage in excess of the armour is still dealt).",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 3,
              "armourInteraction": "blockWithoutDepleting"
            }
          ]
        }
      ],
      "classTags": [
        "Plunderer"
      ]
    },
    {
      "id": "twinaxe_plunderer", "set": "Realms of Man",
      "name": "Twinaxe Plunderer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/twinaxe_plunderer.png",
      "passives": [
        {
          "id": "twin_fury",
          "name": "Twin Fury",
          "trigger": "self.dealsDamageToEnemyWithAttack",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Once per turn, after this unit deals damage to an enemy unit with an attack, Loot 1. When you do, you may have this attack deal 4 damage to a different enemy unit within range 1 of this unit.",
          "effects": [
            {
              "type": "loot",
              "amount": 1
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "target": "differentEnemyWithinRange:1",
              "optional": true,
              "partOfTriggeringAttack": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "axe_toss",
          "name": "Axe Toss",
          "cost": 1,
          "range": [1, 2],
          "rangeText": "2",
          "target": "unit",
          "text": "Deals 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            }
          ]
        },
        {
          "id": "double_chop",
          "name": "Double Chop",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 4 damage. Hits 2 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ]
        }
      ],
      "classTags": [
        "Plunderer"
      ]
    },
    {
      "id": "daring_cavalier",
      "set": "Realms of Man",
      "name": "Daring Cavalier",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Knight"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/daring_cavalier.png",
      "passives": [],
      "abilities": [
        {
          "id": "knightly_armament",
          "name": "Knightly Armament",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free, except it deals an additional 1 damage on the first hit, and this unit armours up to 2.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "addDamage": {
                "amount": 1,
                "scope": "firstHit"
              }
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ],
          "script": null
        },
        {
          "id": "mounted_charge",
          "name": "Mounted Charge",
          "cost": 2,
          "text": "This unit moves 3 tiles, changing direction exactly once but not turning back the way it came. It may move over units this way, and doing so deals 8 damage to each of those units. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 3,
              "path": {
                "directionChanges": 1,
                "noReversal": true
              },
              "mayMoveOverUnits": true,
              "damageToUnitsMovedOver": 8,
              "finalTileMustBeEmpty": true
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "orders_chosen", "set": "Realms of Man",
      "name": "Order's Chosen",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Knight"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/orders_chosen.png",
      "passives": [
        {
          "id": "shield_of_blessings",
          "name": "Shield of Blessings",
          "trigger": "static",
          "text": "When this unit has armour on it, its attacks deal an additional 2 damage.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "if": "self.hasArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "gird_for_battle",
          "name": "Gird for Battle",
          "cost": 1,
          "tags": [
            "react"
          ],
          "text": "Armour up to 6. Until the end of your opponent's next turn, reflect the next ranged attack that targets this unit.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 6
            },
            {
              "type": "setReact",
              "duration": "untilEndOfOpponentNextTurn",
              "once": true,
              "trigger": "self.targetedByRangedAttack",
              "effects": [
                {
                  "type": "reflect"
                }
              ]
            }
          ],
          "script": null
        },
        {
          "id": "blessed_armament",
          "name": "Blessed Armament",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free. If this attack did not deal bonus damage from Shield of Blessings, gain 2 armour.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 2,
              "if": "noShieldOfBlessingsBonusDealt"
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "ironclad_peacekeeper",
      "set": "Realms of Man",
      "name": "Hardened Peacekeeper",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Knight"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/hardened_peacekeeper.png",
      "passives": [
        {
          "id": "gravity",
          "name": "Gravity",
          "trigger": "static",
          "text": "Enemy units that start their turn surrounding this unit must spend an additional 1AP if they choose to move.",
          "effects": [
            {
              "type": "increaseMoveCost",
              "target": "enemyUnitsStartingTurnSurroundingSelf",
              "amount": 1,
              "scope": "firstMoveOfTurn"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "protective_blow",
          "name": "Protective Blow",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free. Then, this unit gains 1 armour.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 1
            }
          ],
          "script": null
        },
        {
          "id": "battered_shield",
          "name": "Battered Shield",
          "cost": 2,
          "text": "Armour up to 7. Surrounding friendly units may use this unit's armour as their own until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 7
            },
            {
              "type": "shareArmour",
              "units": "friendlyUnitsSurroundingSelf",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "vanguard_commander", "set": "Realms of Man",
      "name": "Vanguard Commander",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Knight"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/vanguard_commander.png",
      "passives": [
        {
          "id": "banners_cover",
          "name": "Banner's Cover",
          "trigger": "static",
          "text": "Friendly units surrounding this unit take 1 damage less from ranged attacks.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "friendlyUnitsSurroundingSelf",
              "from": "rangedAttack",
              "per": "attack"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "tactical_swap",
          "name": "Tactical Swap",
          "isMultiStage": true,
          "cost": 1,
          "text": "Swap positions with the target unit.",
          "effects": [
            {
              "type": "swapPositions",
              "units": [
                "self",
                "target"
              ]
            }
          ],
          "script": null,
          "target": "friendlyUnit",
          "targetText": "targets friendly unit",
          "range": [1, 1],
          "rangeText": "1"
        },
        {
          "id": "commanding_strike",
          "name": "Commanding Strike",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            }
          ],
          "script": null
        },
        {
          "id": "shield_bash_and_cleave",
          "name": "Shield Bash & Cleave",
          "cost": 2,
          "text": "Removes up to 2 armour from target unit. Deals 7 damage. Then, hits again dealing 4 damage to the target and all enemy units surrounding it.",
          "effects": [
            {
              "type": "removeArmour",
              "target": "target",
              "amount": 2,
              "upTo": true
            },
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "asAdditionalHit": true,
              "area": "targetAndEnemyUnitsSurroundingTarget"
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "nexus_sorcerer",
      "set": "Realms of Man",
      "name": "Nexus Sorcerer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Mage"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/nexus_sorcerer.png",
      "passives": [],
      "abilities": [
        {
          "id": "invoke_sorcery",
          "name": "Invoke Sorcery",
          "cost": 1,
          "text": "Use a 1AP attack on the promoted card as this ability for free, except it deals an additional 1 damage on the first hit.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "addDamage": {
                "amount": 1,
                "scope": "firstHit"
              }
            }
          ],
          "script": null
        },
        {
          "id": "aetheric_channel",
          "name": "Aetheric Channel",
          "cost": 1,
          "text": "Use a 2AP attack on the promoted card as this ability for free (Use it as though 2AP were spent regardless of this ability's cost). Use only once per turn.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 2,
                "kind": "attack"
              },
              "free": true,
              "asAP": 2
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "nexus_displacement",
          "name": "Nexus Displacement",
          "isMultiStage": true,
          "cost": 3,
          "text": "Each target swaps tile position with the other (ignoring units in the way).",
          "effects": [
            {
              "type": "swapPositions",
              "units": [
                "target1",
                "target2"
              ],
              "ignoreUnitsInWay": true
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "otherFriendlyUnitAndEnemyUnit",
          "targetText": "targets 1 other friendly unit and 1 enemy unit",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "catalyst_curator",
      "set": "Realms of Man",
      "name": "Catalyst Curator",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Mage"
          ]
        ]
      },
      "hp": 22,
      "ap": 3,
      "art": "art/catalyst_curator.png",
      "passives": [
        {
          "id": "esoteric_pathways",
          "name": "Esoteric Pathways",
          "trigger": "static",
          "text": "This unit can move into a board boundary if there is an empty tile on the opposite board boundary in the same row or column. Doing so moves it to that tile (without passing through any units in the way. Still pay the AP cost for this unit to move).",
          "effects": [
            {
              "type": "wrapAroundMove",
              "target": "self",
              "if": "oppositeBoundaryTileEmptyInSameRowOrColumn",
              "passesThroughUnits": false,
              "payMoveCost": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "magic_missile",
          "name": "Magic Missile",
          "cost": 1,
          "text": "Deals 5 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "range": [
            1,
            4
          ],
          "rangeText": "1-4"
        },
        {
          "id": "overload_gemstone",
          "name": "Overload Gemstone",
          "cost": 1,
          "text": "Use a 1AP attack on the promoted card twice for free as this ability, both against the same target. Use only once per turn. During your next turn, this unit can't use this ability.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "times": 2,
              "sameTarget": true,
              "repeatFirstChoice": true,
              "repeatAsSeparateUses": true
            },
            {
              "type": "lockAbility",
              "target": "self",
              "ability": "overload_gemstone",
              "duration": "yourNextTurn"
            }
          ],
          "script": "overload_gemstone",
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "quartz_ray",
          "name": "Quartz Ray",
          "cost": 2,
          "text": "Deals 8 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "allUnitsInLine"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "straightLine": true,
          "target": "direction"
        }
      ],
      "classTags": []
    },
    {
      "id": "leyline_invoker",
      "set": "Realms of Man",
      "name": "Leyline Invoker",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Mage"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/leyline_invoker.png",
      "passives": [
        {
          "id": "volatile_hexes",
          "name": "Volatile Hexes",
          "trigger": "self.attackDealsDamageToUnit",
          "text": "Whenever an attack from this unit deals damage to a unit, the tile that unit is on becomes scorched until the end of your opponent's next turn (units moving onto or off of a scorched tile take 4 damage).",
          "effects": [
            {
              "type": "scorchTile",
              "tile": "damagedUnitTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "echoing_incantation",
          "name": "Echoing Incantation",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free. This unit may target an empty tile with this attack.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "allowEmptyTileTarget": true
            }
          ],
          "script": null
        },
        {
          "id": "ley_rupture",
          "name": "Ley-Rupture",
          "cost": 2,
          "text": "Deals 6 damage to units on the target tile and 4 damage to all units on tiles directly behind it in a straight line (up to the board edge).",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allTilesBehindTargetInLine"
            }
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "tags": []
        }
      ],
      "classTags": []
    },
    {
      "id": "frostbinder",
      "set": "Realms of Man",
      "name": "Frostbinder",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Mage"
          ]
        ]
      },
      "hp": 19,
      "ap": 3,
      "art": "art/frostbinder.png",
      "passives": [
        {
          "id": "freezing_shell",
          "name": "Freezing Shell",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 2.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "glacial_bolt",
          "name": "Glacial Bolt",
          "cost": [
            1,
            2
          ],
          "text": "Deals 6 damage. If 2AP was spent, if the target takes the next turn, it must spend an additional 1AP on its first action that turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "increaseActionCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstActionOfTurn",
              "duration": "nextTurnIfTargetTakesIt",
              "if": "apSpent==2"
            }
          ],
          "script": null,
          "target": "unit",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        },
        {
          "id": "ice_lance",
          "name": "Ice Lance",
          "cost": 2,
          "text": "Deals 11 damage. The target cannot be promoted or fused during your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 11,
              "hits": 1
            },
            {
              "type": "cannotBePromotedOrFused",
              "target": "hitUnit",
              "duration": "opponentNextTurn"
            }
          ],
          "script": "ice_lance",
          "tags": [],
          "target": "unit",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "barbarian_tyrant",
      "set": "Realms of Man",
      "name": "Barbarian Tyrant",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Fighter"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/barbarian_tyrant.png",
      "passives": [],
      "abilities": [
        {
          "id": "tenacious_slam",
          "name": "Tenacious Slam",
          "cost": 1,
          "text": "Use a 1AP melee attack of the promoted card as this ability for free, bypassing up to 4 armour.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "bypassArmourUpTo": 4
            }
          ],
          "script": null
        },
        {
          "id": "whirlwind_execution",
          "name": "Whirlwind Execution",
          "cost": 2,
          "text": "Deals 11 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 11,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "veteran_armsmaster", "set": "Realms of Man",
      "name": "Veteran Armsmaster",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Fighter"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/veteran_armsmaster.png",
      "passives": [],
      "abilities": [
        {
          "id": "demonstrate_form",
          "name": "Demonstrate Form",
          "cost": 1,
          "text": "Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "elevated_technique",
          "name": "Elevated Technique",
          "cost": 1,
          "text": "Use a 1AP ability of the promoted card as this ability for free. If it was a melee attack, it deals an additional 1 damage per hit. If it wasn't an attack, this unit gains 2 armour. Use only once per turn.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1
              },
              "free": true,
              "meleeAddDamage": {
                "amount": 1,
                "scope": "allHits"
              },
              "ifNotAttack": [
                {
                  "type": "armour",
                  "target": "self",
                  "amount": 2
                }
              ]
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "bladefury",
          "name": "Bladefury",
          "cost": 3,
          "text": "Deals damage equal to the lowest damage number (per hit) among attacks of the promoted card. Then, subtract that number from 7, to a minimum of 1. Hits 4 more times dealing that amount of damage.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "formula": "lowestPerHitDamage(promotedCard.attacks)"
              },
              "hits": 1
            },
            {
              "type": "damage",
              "amount": {
                "formula": "max(1, 7 - firstHitAmount)"
              },
              "hits": 4,
              "asAdditionalHit": true
            }
          ],
          "script": "bladefury",
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "defiant_adept",
      "set": "Realms of Man",
      "name": "Defiant Adept",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Fighter"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/defiant_adept.png",
      "passives": [
        {
          "id": "flowing_stance",
          "name": "Flowing Stance",
          "trigger": "static",
          "text": "If this unit has not moved this turn, its melee attacks are treated as having Range 1-2.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "self",
              "appliesTo": "meleeAttacks",
              "setRange": [
                1,
                2
              ],
              "if": "self.hasNotMovedThisTurn"
            }
          ],
          "script": "flowing_stance"
        }
      ],
      "abilities": [
        {
          "id": "too_easy",
          "name": "Too Easy",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free, except it deals an additional 2 damage on the first hit. Use only once per turn.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "addDamage": {
                "amount": 2,
                "scope": "firstHit"
              }
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "shifting_strike",
          "name": "Shifting Strike",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free. This unit may move 1 tile for free before choosing a target for this attack.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "before": [
                {
                  "type": "move",
                  "target": "self",
                  "distance": 1,
                  "free": true,
                  "optional": true
                }
              ]
            }
          ],
          "script": null
        },
        {
          "id": "flawless_parry",
          "name": "Flawless Parry",
          "cost": 2,
          "text": "The next time this unit would take damage from an attack until the end of your opponent's next turn, prevent up to 4 damage. Then, if the attacker is within range 1, reflect the attack back at them. This unit's turn ends.",
          "effects": [
            {
              "type": "setReact",
              "duration": "untilEndOfOpponentNextTurn",
              "once": true,
              "trigger": "self.wouldTakeDamageFromAttack",
              "effects": [
                {
                  "type": "preventDamage",
                  "target": "self",
                  "upTo": 4
                },
                {
                  "type": "reflect",
                  "if": "attacker.withinRange:1"
                }
              ]
            },
            {
              "type": "endTurn",
              "target": "self"
            }
          ],
          "script": "flawless_parry",
          "tags": [
            "react",
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "skirmish_captain",
      "set": "Realms of Man",
      "name": "Skirmish Captain",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Fighter"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/skirmish_captain.png",
      "passives": [
        {
          "id": "target_acquired",
          "name": "Target Acquired",
          "trigger": "self.damagesEnemyUnit",
          "text": "Enemy units damaged by this unit take an additional 1 damage per hit from the next attack that hits them this turn.",
          "effects": [
            {
              "type": "markUnit",
              "target": "damagedUnit",
              "duration": "thisTurn",
              "bonusDamagePerHit": 1,
              "consumeOn": "nextAttackThatHitsIt"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "vaulting_strike",
          "name": "Vaulting Strike",
          "isMultiStage": true,
          "cost": 1,
          "text": "Deals 6 damage. Then, you may place this unit on an empty tile surrounding the target (if there is one).",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "place",
              "target": "self",
              "tile": "chosenEmptySurroundingTarget",
              "optional": true
            }
          ],
          "script": null,
          "target": "unit",
          "tags": [
            "melee",
            "inspiring"
          ]
        },
        {
          "id": "skirmishers_fury",
          "name": "Skirmisher's Fury",
          "cost": 2,
          "text": "Deals 5 damage. Hits three times.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "wielder_of_night", "set": "Realms of Man",
      "name": "Wielder of Night",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Assassin"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/wielder_of_night.png",
      "passives": [
        {
          "id": "nightbound",
          "name": "Nightbound",
          "trigger": "static",
          "text": "This unit cannot be targeted by react effects.",
          "effects": [
            {
              "type": "cannotBeTargeted",
              "by": "reactEffects",
              "target": "self"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "umbral_strike",
          "name": "Umbral Strike",
          "cost": 1,
          "text": "Use a 1AP melee attack of the promoted card as this ability for free. If this attack was made from the tile behind the target, it deals an additional 3 damage on the first hit.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "addDamage": {
                "amount": 3,
                "scope": "firstHit",
                "if": "selfOnTileBehindTarget"
              }
            }
          ],
          "script": null
        },
        {
          "id": "vanish",
          "name": "Vanish",
          "cost": 1,
          "text": "Move this unit to any empty tile within Range 2 (ignoring units in the way). This unit cannot be targeted during your opponent's next turn. This unit's turn ends.",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true
            },
            {
              "type": "cannotBeTargeted",
              "target": "self",
              "duration": "opponentNextTurn"
            },
            {
              "type": "endTurn",
              "target": "self"
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "emptyTile",
          "range": [1, 2],
          "rangeText": "2"
        }
      ],
      "classTags": []
    },
    {
      "id": "blight_phantom",
      "set": "Realms of Man",
      "name": "Blight Phantom",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Assassin"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/blight_phantom.png",
      "passives": [
        {
          "id": "noxious_burst",
          "name": "Noxious Burst",
          "trigger": "self.killsEnemyUnit",
          "text": "Whenever this unit kills an enemy unit that was affected by Death Mark, any unit surrounding the tile where it died must lose 1AP if they take the next turn.",
          "effects": [
            {
              "type": "loseAP",
              "target": "unitsSurroundingDeathTile",
              "amount": 1,
              "duration": "nextTurnIfTheyTakeIt",
              "if": "killedUnit.hadStatus:death_mark"
            }
          ],
          "script": "noxious_burst"
        }
      ],
      "abilities": [
        {
          "id": "cruel_slice",
          "name": "Cruel Slice",
          "cost": 1,
          "text": "Use a 1AP melee attack of the promoted card as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            }
          ],
          "script": null
        },
        {
          "id": "death_mark",
          "name": "Death Mark",
          "cost": 1,
          "text": "Target an enemy unit. This turn, this unit's attacks against that unit deal an additional 5 damage on the first hit. This effect does not stack.",
          "effects": [
            {
              "type": "applyStatus",
              "status": "death_mark",
              "target": "target",
              "duration": "thisTurn",
              "stacks": false,
              "effects": [
                {
                  "type": "damageBonus",
                  "appliesTo": "ownAttacksAgainstTarget",
                  "amount": 5,
                  "scope": "firstHit"
                }
              ]
            }
          ],
          "script": "death_mark",
          "tags": [
            "inspiring"
          ],
          "target": "enemyUnit",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "high_seas_captain", "set": "Realms of Man",
      "name": "High Seas Captain",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Plunderer"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/high_seas_captain.png",
      "passives": [
        {
          "id": "plunderers_due",
          "name": "Plunderer's Due",
          "trigger": "self.loots",
          "text": "The first time each turn this unit loots, you may loot 1 again.",
          "effects": [
            {
              "type": "loot",
              "amount": 1,
              "optional": true
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "avast",
          "name": "Avast",
          "cost": 1,
          "text": "Use a 1AP attack of the promoted card as this ability for free, except loot 1 first.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "before": [
                {
                  "type": "loot",
                  "amount": 1
                }
              ]
            }
          ],
          "script": null
        },
        {
          "id": "blunderbuss_volley",
          "name": "Blunderbuss Volley",
          "cost": 2,
          "text": "Deals 5 damage. Hits 3 times. Armour blocks this attack without depleting (damage in excess of the armour is still dealt).",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 3,
              "armourInteraction": "blockWithoutDepleting"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "unit",
          "range": [1, 2],
          "rangeText": "2"
        }
      ],
      "classTags": []
    },
    {
      "id": "corsair_saboteur",
      "set": "Realms of Man",
      "name": "Corsair Saboteur",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Plunderer"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/corsair_saboteur.png",
      "passives": [
        {
          "id": "rigged_to_blow",
          "name": "Rigged to Blow",
          "trigger": "self.destroysEnemyUnitOrObstructingWall",
          "text": "When this unit kills an enemy unit or an Obstructing Wall, deal 5 damage to all units surrounding the tile that unit was on.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "unitsSurroundingDestroyedTile"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "dirty_blow",
          "name": "Dirty Blow",
          "cost": 1,
          "text": "Use a 1AP ability of the promoted card as this ability for free. If it's an attack, you may have it apply knockback 1.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1
              },
              "free": true,
              "ifAttackOptionalKnockback": 1
            }
          ],
          "script": null
        },
        {
          "id": "grappling_hook",
          "name": "Grappling Hook",
          "isMultiStage": true,
          "cost": 2,
          "text": "Move the target unit to the closest empty tile surrounding this unit, then deal 5 damage to it. If the target cannot be moved, this unit moves to the closest empty tile surrounding the target instead (if there is more than one closest empty tile, choose one).",
          "effects": [
            {
              "type": "move",
              "unit": "target",
              "tile": "closestEmptySurroundingSelf",
              "fallback": {
                "unit": "self",
                "tile": "closestEmptySurroundingTarget"
              },
              "tiebreak": "controllerChooses"
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "unit",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "grandfather_mystic",
      "set": "Realms of Man",
      "name": "Grandfather Oracle",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Sage"
          ]
        ]
      },
      "hp": 20,
      "ap": 3,
      "art": "art/grandfather_mystic.png",
      "passives": [
        {
          "id": "tapestry_of_fate",
          "name": "Tapestry of Fate",
          "trigger": "self.draws",
          "text": "Whenever this unit draws a card, this unit heals 4 damage.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": 4
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "wizened_gaze",
          "name": "Wizened Gaze",
          "cost": 1,
          "text": "Use a 1AP ability of the promoted card as this ability for free. Use only once per turn.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1
              },
              "free": true
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "foretell",
          "name": "Foretell",
          "cost": 2,
          "text": "Reveal the top 2 cards of your deck. Draw one of them and leave the other on top. If the card added to your hand is a unit card, you may immediately Reinforce it (promoting a unit or fusing a unit to its surrounding unit(s) if necessary and possible).",
          "effects": [
            {
              "type": "revealTop",
              "deck": "own",
              "count": 2,
              "chooseOneToHand": true,
              "restOnTop": true
            },
            {
              "type": "reinforce",
              "card": "chosenCard",
              "optional": true,
              "if": "card.isUnit",
              "allowPromoteOrFusion": true
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "frenzied_burster",
      "set": "Realms of Man",
      "name": "Frenzied Burster",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "*"
          ]
        ],
        "timing": "react:enemyUnitUsesAction"
      },
      "hp": 30,
      "ap": 3,
      "art": "art/frenzied_burster.png",
      "passives": [
        {
          "id": "mindless",
          "name": "Mindless",
          "trigger": "static",
          "text": "This unit cannot use the Universal Draw Action.",
          "effects": [
            {
              "type": "cannotUse",
              "action": "universalDrawAction",
              "target": "self"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "smash",
          "name": "Smash",
          "cost": 1,
          "text": "Deals 8 damage. Use a maximum of twice per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ],
          "limits": {
            "maxPerTurn": 2
          }
        },
        {
          "id": "frenzied_swipe",
          "name": "Frenzied Swipe",
          "cost": 2,
          "text": "Deals 12 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 12,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "giant_boar", "set": "Realms of Man",
      "name": "Giant Boar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 32,
      "ap": 3,
      "art": "art/giant_boar.png",
      "passives": [
        {
          "id": "unstoppable_charge",
          "name": "Unstoppable Charge",
          "trigger": "self.movedTwoOrMoreTilesInStraightLine",
          "text": "Whenever this unit moves 2 or more tiles in a straight line during a turn, its next attack deals an additional 1 damage per hit and inflicts knockback 1 on its last hit.",
          "effects": [
            {
              "type": "buffNextAttack",
              "target": "self",
              "duration": "thisTurn",
              "addDamage": {
                "amount": 1,
                "scope": "allHits"
              },
              "knockbackOnLastHit": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "goring_tusks",
          "name": "Goring Tusks",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "cloven_crash",
          "name": "Cloven Crash",
          "cost": 2,
          "text": "Use this ability only if this unit has moved this turn. Deals 8 damage. Hits twice. The second hit may target a different unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 2,
              "secondHitMayTargetDifferentUnit": true
            }
          ],
          "tags": [
            "melee"
          ],
          "requires": "self.movedThisTurn"
        }
      ],
      "classTags": []
    },
    {
      "id": "siege_mammoth", "set": "Realms of Man",
      "name": "Siege Mammoth",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 30,
      "ap": 3,
      "art": "art/siege_mammoth.png",
      "passives": [
        {
          "id": "thick_hide",
          "name": "Thick Hide",
          "trigger": "static",
          "text": "Reduces all damage taken from attacks by 1, to a minimum of 1 damage per hit.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "attack",
              "per": "hit",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "sweeping_trunk",
          "name": "Sweeping Trunk",
          "cost": 1,
          "text": "Deals 6 damage to the target unit and 3 damage to all other enemy units surrounding this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "otherEnemyUnitsSurroundingSelf"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "earthshaking_stomp",
          "name": "Earthshaking Stomp",
          "cost": 2,
          "text": "Deals 9 damage to all enemy units on or surrounding the target tile.",
          "effects": [
            {
              "type": "damage",
              "amount": 9,
              "hits": 1,
              "area": "enemyUnitsOnOrSurroundingTargetTile"
            }
          ],
          "tags": [
            "melee"
          ],
          "target": "tile",
          "targetText": "targets tile"
        }
      ],
      "classTags": []
    },
    {
      "id": "savage_grizzly", "set": "Realms of Man",
      "name": "Savage Grizzly",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 30,
      "ap": 3,
      "art": "art/savage_grizzly.png",
      "passives": [
        {
          "id": "enrage",
          "name": "Enrage",
          "trigger": "static",
          "text": "If this unit is damaged, it deals an additional 1 damage per hit with attacks.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 1,
              "scope": "allHits",
              "if": "self.hasDamage"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "terrifying_roar",
          "name": "Terrifying Roar",
          "cost": 1,
          "text": "Until the end of your opponent's next turn, the target unit must spend an additional 1AP to take its first action. Use only once per turn.",
          "effects": [
            {
              "type": "increaseActionCost",
              "target": "target",
              "amount": 1,
              "scope": "firstAction",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null,
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "range": [1, 2],
          "rangeText": "1-2"
        },
        {
          "id": "relentless_claws",
          "name": "Relentless Claws",
          "cost": 1,
          "text": "Deals 3 damage. Hits 3 times. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "reckless_leap",
          "name": "Reckless Leap",
          "cost": 2,
          "text": "Move this unit 2 tiles in the same direction for free. Then, this unit takes 3 damage.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "direction": "same",
              "free": true
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "target": "self"
            }
          ],
          "script": null,
          "target": "emptyTile",
          "range": [
            1,
            2
          ],
          "rangeText": "2"
        }
      ],
      "classTags": []
    },
    {
      "id": "spitfire_drake",
      "set": "Realms of Man",
      "name": "Spitfire Drake",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 26,
      "ap": 3,
      "art": "art/spitfire_drake.png",
      "passives": [
        {
          "id": "aerial_apex",
          "name": "Aerial Apex",
          "trigger": "static",
          "text": "This unit may move over other units. Moving onto an enemy unit this way deals 3 damage to that unit. If this unit would end its turn while it is not alone on its tile, move this unit to an empty surrounding tile for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "damage",
                  "target": "otherUnitOnTile",
                  "amount": 3,
                  "ifOtherIsEnemy": true
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "flaming_dive",
          "name": "Flaming Dive",
          "cost": 1,
          "text": "Deals 7 damage. If this unit moved before declaring this attack this turn, this attack deals an additional 2 damage (as a single hit).",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "modifiers": [
                {
                  "if": "self.movedBeforeDeclaringThisTurn",
                  "addAmount": 2,
                  "scope": "firstHit"
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "spitfire_landing",
          "name": "Spitfire Landing",
          "cost": 2,
          "text": "Move up to 3 tiles in a straight line for free, then deal 8 damage to all enemy units surrounding this unit.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "straightLine": true,
              "free": true
            },
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "tempest_roc",
      "set": "Realms of Man",
      "name": "Tempest Roc",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 29,
      "ap": 3,
      "art": "art/tempest_roc.png",
      "passives": [
        {
          "id": "gale_wings",
          "name": "Gale Wings",
          "trigger": "static",
          "text": "Takes 2 less damage from ranged attacks, to a minimum of 1 damage per hit.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 2,
              "target": "self",
              "from": "rangedAttack",
              "per": "hit",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "razor_talons",
          "name": "Razor Talons",
          "cost": 1,
          "text": "Deals 4 damage. Hits 2 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "storm_buffet",
          "name": "Storm Buffet",
          "cost": 1,
          "text": "Deals 4 damage. Hits 2 times. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "range": [
            1,
            2
          ],
          "rangeText": "1-2"
        },
        {
          "id": "spirit_away",
          "name": "Spirit Away",
          "isMultiStage": true,
          "cost": 2,
          "text": "Choose up to 1 unit target within range 1 of this unit (friendly or enemy). Move this unit to the target tile. Then, if a unit was targeted, you may place it on an empty tile surrounding this unit.",
          "effects": [
            {
              "type": "chooseUnit",
              "id": "spiritTarget",
              "count": {
                "max": 1
              },
              "within": "range1OfSelf",
              "allegiance": "any"
            },
            {
              "type": "move",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "place",
              "unit": "spiritTarget",
              "tile": "chosenEmptySurroundingSelf",
              "optional": true,
              "if": "spiritTarget.chosen"
            }
          ],
          "script": null,
          "target": "emptyTile",
          "targetText": "empty tile target",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "corrosive_wyvern", "set": "Realms of Man",
      "name": "Corrosive Wyvern",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 28,
      "ap": 3,
      "art": "art/corrosive_wyvern.png",
      "passives": [
        {
          "id": "sizzling_venom",
          "name": "Sizzling Venom",
          "trigger": "static",
          "text": "Attacks from this unit bypass up to 3 armour.",
          "effects": [
            {
              "type": "bypassArmourUpTo",
              "amount": 3,
              "appliesTo": "ownAttacks"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "tail_spike",
          "name": "Tail Spike",
          "cost": 1,
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ],
          "target": "unit",
          "range": [1, 2],
          "rangeText": "2"
        },
        {
          "id": "swooping_pounce",
          "name": "Swooping Pounce",
          "isMultiStage": true,
          "cost": 2,
          "text": "Move this unit to an empty tile surrounding the target. Then, if the target is an enemy, deals 10 damage.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "chosenEmptySurroundingTarget"
            },
            {
              "type": "damage",
              "amount": 10,
              "hits": 1,
              "if": "target.isEnemy"
            }
          ],
          "script": null,
          "target": "anyUnit",
          "targetText": "can target friendly",
          "range": [1, 2],
          "rangeText": "1-2"
        }
      ],
      "classTags": []
    },
    {
      "id": "carapace_crusher", "set": "Realms of Man",
      "name": "Carapace Crusher",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 31,
      "ap": 3,
      "art": "art/carapace_crusher.png",
      "passives": [
        {
          "id": "heavy_shell",
          "name": "Heavy Shell",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 4.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 4
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "pincer_clamp",
          "name": "Pincer Clamp",
          "cost": 1,
          "text": "Deals 6 damage. The target unit cannot move during its controller's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "cannotMove",
              "target": "hitUnit",
              "duration": "controllersNextTurn"
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ]
        },
        {
          "id": "sidestepping_crush",
          "name": "Sidestepping Crush",
          "cost": 2,
          "isMultiStage": true,
          "text": "Move 1 tile, gain 2 armour, then deal 8 damage to a surrounding enemy unit. This unit cannot use this ability to move in a direction it has already moved this turn.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "restriction": "notDirectionAlreadyMovedThisTurn"
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 2
            },
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "target": "chosenEnemyUnitSurroundingSelf"
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "octopod_titan",
      "set": "Realms of Man",
      "name": "Octopod Titan",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 29,
      "ap": 3,
      "art": "art/octopod_titan.png",
      "passives": [
        {
          "id": "cephalopod_reach",
          "name": "Cephalopod Reach",
          "trigger": "static",
          "text": "This unit's melee attacks have Range 1-2.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "self",
              "appliesTo": "meleeAttacks",
              "amount": 1,
              "setRange": [
                1,
                2
              ]
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "tentacle_drag",
          "name": "Tentacle Drag",
          "cost": 1,
          "text": "Deals 5 damage. If the target is not on a tile surrounding this unit, you may place it on an empty tile surrounding this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "place",
              "unit": "hitUnit",
              "tile": "chosenEmptySurroundingSelf",
              "optional": true,
              "if": "!target.isSurroundingSelf"
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ]
        },
        {
          "id": "constrict_and_thrash",
          "name": "Constrict & Thrash",
          "cost": 2,
          "text": "Deals 4 damage. Hits 3 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "marsh_hydra",
      "set": "Realms of Man",
      "name": "Marsh Hydra",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": []
      },
      "hp": 30,
      "ap": 3,
      "art": "art/marsh_hydra.png",
      "passives": [
        {
          "id": "regenerative_flesh",
          "name": "Regenerative Flesh",
          "trigger": "ownTurnStart",
          "text": "At the start of your turn, if this unit is damaged, it heals 3 damage.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": 3,
              "if": "self.hasDamage"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "multi_head_lash",
          "name": "Multi-Head Lash",
          "isMultiStage": true,
          "cost": 1,
          "text": "Deals 5 damage to up to 2 different enemy targets within range.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "target": "enemyUnit",
          "targetCount": {
            "max": 2,
            "distinct": true
          },
          "range": [
            1,
            2
          ],
          "rangeText": "1-2"
        },
        {
          "id": "acidic_bile",
          "name": "Acidic Bile",
          "cost": 2,
          "text": "Deals 6 damage to units on the target tile and 4 damage to all surrounding enemy units. This attack bypasses armour.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "targetTile",
              "bypassArmour": true
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "enemyUnitsSurroundingTargetTile",
              "bypassArmour": true
            }
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2"
        }
      ],
      "classTags": []
    },
    {
      "id": "gateway_guardians",
      "set": "Realms of Man",
      "name": "Gateway Guardians",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight"
          ]
        ]
      },
      "hp": 30,
      "ap": 3,
      "art": "art/gateway_guardians.png",
      "passives": [
        {
          "id": "hold_the_gate",
          "name": "Hold the Gate",
          "trigger": "self.wouldBeKnockedBackOnOpponentTurn",
          "text": "During your opponent's turn, if this unit would be knocked back, you may make it immune to knockback until the end of the turn. If you do, this unit becomes unable to inflict knockback during your next turn.",
          "effects": [
            {
              "type": "immune",
              "to": "knockback",
              "target": "self",
              "duration": "untilEndOfTurn"
            },
            {
              "type": "cannotInflictKnockback",
              "target": "self",
              "duration": "yourNextTurn"
            }
          ],
          "script": null,
          "optional": true
        }
      ],
      "abilities": [
        {
          "id": "deny_entry",
          "name": "Deny Entry",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free. You may have that attack apply knockback 1.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "optionalKnockback": 1
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ]
        },
        {
          "id": "fortified_blows",
          "name": "Fortified Blows",
          "cost": 2,
          "text": "Deals damage equal to this unit's armour. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "formula": "self.armour"
              },
              "hits": 2
            }
          ],
          "tags": [
            "melee",
            "inspiring"
          ]
        },
        {
          "id": "guardian_stance",
          "name": "Guardian Stance",
          "cost": 1,
          "text": "Armour up to 6.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 6
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "drakerider_paladin",
      "set": "Realms of Man",
      "name": "Drakerider Paladin",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight"
          ]
        ]
      },
      "hp": 29,
      "ap": 3,
      "art": "art/drakerider_paladin.png",
      "passives": [
        {
          "id": "drakescale",
          "name": "Drakescale",
          "trigger": "static",
          "text": "While this unit has armour, it cannot be knocked back and its melee attacks deal an additional 2 damage per hit.",
          "effects": [
            {
              "type": "immune",
              "to": "knockback",
              "target": "self",
              "if": "self.hasArmour"
            },
            {
              "type": "damageBonus",
              "appliesTo": "ownMeleeAttacks",
              "amount": 2,
              "scope": "allHits",
              "if": "self.hasArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "paladins_smite",
          "name": "Paladin's Smite",
          "cost": 1,
          "text": "This unit gains 1 armour to a maximum of 4 armour. Then, use a 1AP attack from among the promoted cards as this ability for free.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "amount": 1,
              "max": 4
            },
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ]
        },
        {
          "id": "drakes_flight",
          "name": "Drake's Flight",
          "cost": 2,
          "text": "This unit moves 3 or 4 tiles (your choice), changing direction exactly once but not turning back the way it came. It may move over units this way, and doing so deals 8 damage to each of those units. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "min": 3,
                "max": 4
              },
              "path": {
                "directionChanges": 1,
                "noReversal": true
              },
              "mayMoveOverUnits": true,
              "damageToUnitsMovedOver": 8,
              "finalTileMustBeEmpty": true
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "animus_twin",
      "set": "Realms of Man",
      "name": "Animus Twin",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/animus_twin.png",
      "passives": [
        {
          "id": "twinsoul",
          "name": "Twinsoul",
          "trigger": "multiple",
          "text": "At the start of each player's turn, armour up to 2. Every second attack this unit uses each turn deals an additional 2 damage per hit.",
          "effects": [
            {
              "trigger": "turnStart",
              "type": "armour",
              "target": "self",
              "upTo": 2
            },
            {
              "trigger": "static",
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "allHits",
              "if": "attackNumberThisTurnIsEven"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "ready_spell",
          "name": "Ready Spell",
          "cost": 1,
          "text": "This unit may use a 2AP ability for free once as a react effect when an enemy unit takes an action until the end of your opponent's next turn. This unit's turn ends.",
          "effects": [
            {
              "type": "setReact",
              "duration": "untilEndOfOpponentNextTurn",
              "trigger": "enemyUnitTakesAction",
              "optional": true,
              "effects": [
                {
                  "type": "useAbility",
                  "source": "self",
                  "filter": {
                    "cost": 2
                  },
                  "free": true
                }
              ],
              "once": true
            },
            {
              "type": "endTurn",
              "target": "self"
            }
          ],
          "script": null,
          "tags": [
            "react",
            "inspiring"
          ]
        },
        {
          "id": "dual_casting",
          "name": "Dual Casting",
          "cost": 2,
          "text": "Use 2 different 1AP attacks from among the promoted cards as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "times": 2,
              "distinct": true
            }
          ],
          "script": null
        },
        {
          "id": "arcane_convergence",
          "name": "Arcane Convergence",
          "cost": 2,
          "text": "Use a 2AP attack from among the promoted cards as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 2,
                "kind": "attack"
              },
              "free": true,
              "asAP": 2
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "starburst_wizard", "set": "Realms of Man",
      "name": "Starburst Wizard",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/starburst_wizard.png",
      "passives": [
        {
          "id": "solar_resonance",
          "name": "Solar Resonance",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 2.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "starburst",
          "name": "Starburst",
          "cost": 2,
          "text": "Deals 8 damage to units on the target tile and 5 damage to units on each of the three tiles after it that form a straight line in the opposite direction from this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "threeTilesBeyondTargetInLineFromSelf"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [2, 3],
          "rangeText": "2-3"
        },
        {
          "id": "shooting_star",
          "name": "Shooting Star",
          "cost": 1,
          "text": "Deals 5 damage to a target. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "range": [1, 9],
          "rangeText": "9"
        }
      ],
      "classTags": []
    },
    {
      "id": "dawnglow_archer", "set": "Realms of Man",
      "name": "Dawnglow Archer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Fighter"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/dawnglow_archer.png",
      "passives": [
        {
          "id": "glimmering_arrows",
          "name": "Glimmering Arrows",
          "trigger": "static",
          "text": "This unit's attacks against armour deal an additional 2 damage per hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "allHits",
              "if": "target.hasArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "swift_shots",
          "name": "Swift Shots",
          "cost": 1,
          "text": "Deals 4 damage. Hits 2 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "target": "unit",
          "range": [1, 3],
          "rangeText": "1-3"
        },
        {
          "id": "multishot",
          "name": "Multishot",
          "isMultiStage": true,
          "cost": 2,
          "text": "Deals 4 damage to up to 4 different targets within range.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            }
          ],
          "target": "enemyUnit",
          "targetCount": {
            "max": 4,
            "distinct": true
          },
          "range": [1, 3],
          "rangeText": "1-3"
        },
        {
          "id": "rain_of_arrows",
          "name": "Rain of Arrows",
          "cost": 3,
          "text": "Deals 2 damage to all units on the target tile or a tile surrounding it. Hits 3 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3,
              "area": "targetTileAndSurrounding"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [2, 4],
          "rangeText": "2-4"
        }
      ],
      "classTags": []
    },
    {
      "id": "breaker_swordsman",
      "set": "Realms of Man",
      "name": "Breaker Swordsman",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Fighter"
          ]
        ]
      },
      "hp": 28,
      "ap": 3,
      "art": "art/breaker_swordsman.png",
      "passives": [
        {
          "id": "breakers_resolve",
          "name": "Breaker's Resolve",
          "trigger": "self.breaksArmourWithAttack",
          "text": "When this unit breaks the armour of an enemy unit with an attack, that attack hits again for 3 damage.",
          "effects": [
            {
              "type": "extraHit",
              "amount": 3,
              "if": "attackBreaksTargetArmour",
              "limit": "oncePerAttack"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "ultra_blade",
          "name": "Ultra Blade",
          "cost": 2,
          "text": "Choose a 1AP melee attack from each promoted card. This attack deals damage equal to the total damage those attacks would deal, as a single hit.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "onePerPromotedCard": true,
              "countsAsSingleHit": true
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "follow_through",
          "name": "Follow Through",
          "cost": 1,
          "text": "Deals 8 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "script": null,
          "tags": [
            "melee",
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "blade_singer",
      "set": "Realms of Man",
      "name": "Blade Singer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage",
            "Fighter"
          ]
        ]
      },
      "hp": 22,
      "ap": 3,
      "art": "art/blade_singer.png",
      "passives": [
        {
          "id": "wheel_of_blades",
          "name": "Wheel of Blades",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 3. When damage is dealt to this unit's armour by a melee attack, it deals that much damage back to the attacker.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            },
            {
              "type": "damage",
              "target": "attacker",
              "amount": "armourDamageTaken",
              "trigger": "self.armourDamagedByMeleeAttack"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "floating_weapon",
          "name": "Floating Weapon",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free, except its range is still this ability's range (it is no longer melee).",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "rangeOverride": [
                1,
                2
              ],
              "noLongerMelee": true
            }
          ],
          "script": null,
          "target": "unit",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2"
        },
        {
          "id": "steel_cyclone",
          "name": "Steel Cyclone",
          "cost": [
            2,
            3
          ],
          "text": "Deals 2 damage. Hits 3 times per AP spent.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": {
                "perAP": 3
              },
              "area": "allUnitsInPath"
            }
          ],
          "target": "tile",
          "targetText": "targets tile, hits all in path",
          "range": [
            1,
            2
          ],
          "rangeText": "2"
        }
      ],
      "classTags": []
    },
    {
      "id": "gemstone_paladin", "set": "Realms of Man",
      "name": "Gemstone Paladin",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage",
            "Knight"
          ]
        ]
      },
      "hp": 28,
      "ap": 3,
      "art": "art/gemstone_paladin.png",
      "passives": [
        {
          "id": "reflective_armour",
          "name": "Reflective Armour",
          "trigger": "multiple",
          "text": "At the start of each player's turn, armour up to 3. When targeted by a ranged attack, this unit deals 3 damage to the attacker.",
          "effects": [
            {
              "trigger": "turnStart",
              "type": "armour",
              "target": "self",
              "upTo": 3
            },
            {
              "trigger": "self.targetedByRangedAttack",
              "type": "damage",
              "target": "attacker",
              "amount": 3,
              "hits": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "crystal_shard",
          "name": "Crystal Shard",
          "cost": 1,
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "target": "unit",
          "range": [1, 2],
          "rangeText": "2"
        },
        {
          "id": "gemstone_hammer",
          "name": "Gemstone Hammer",
          "cost": [1, 2],
          "text": "Deals 3 damage. Use a 1AP ranged attack from among the promoted cards as this ability for free. For each AP spent, do this again (counts as additional hits). Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1
            },
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "ranged": true
              },
              "free": true,
              "times": {
                "perAP": 1
              },
              "countsAsAdditionalHits": true
            }
          ],
          "script": null,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "classTags": []
    },
    {
      "id": "hexbinder",
      "set": "Realms of Man",
      "name": "Hexbinder",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage",
            "Assassin"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/hexbinder.png",
      "passives": [],
      "abilities": [
        {
          "id": "silencing_strike",
          "name": "Silencing Strike",
          "cost": 1,
          "text": "Deals 7 damage. This attack cannot be interrupted by react effects. A unit that took damage from this attack has no passive until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "uninterruptibleByReact": true,
              "ignoresPassives": true
            },
            {
              "type": "removePassives",
              "target": "damagedUnit",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null,
          "tags": [
            "melee",
            "inspiring"
          ]
        },
        {
          "id": "shadow_cast",
          "name": "Shadow Cast",
          "cost": 2,
          "text": "Use up to 2AP on attacks from among the promoted cards as this ability for free. Then, this unit may move 1 tile for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "kind": "attack"
              },
              "free": true,
              "apBudget": 2
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "lobber_gang",
      "set": "Realms of Man",
      "name": "Lobber Gang",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Fighter",
            "Plunderer"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/lobber_gang.png",
      "passives": [
        {
          "id": "sendoff",
          "name": "Sendoff",
          "trigger": "static",
          "text": "Whenever this unit's attack would apply knockback, you may have it apply 1 additional tile of knockback.",
          "effects": [
            {
              "type": "modifyKnockback",
              "target": "ownAttacks",
              "addDistance": 1,
              "optional": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "pilfer",
          "name": "Pilfer",
          "cost": 1,
          "text": "Use a 1AP attack from among the promoted cards as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            }
          ],
          "script": null
        },
        {
          "id": "catapult_foe",
          "name": "Catapult Foe",
          "cost": 2,
          "text": "Deals 4 damage. Knockback 2. For each time the target cannot be knocked back a tile, this attack deals an additional 5 damage instead.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 2,
              "onEachBlockedTile": {
                "type": "damage",
                "amount": 5,
                "instead": true
              }
            }
          ],
          "script": null,
          "tags": [
            "melee",
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "blind_seer",
      "set": "Realms of Man",
      "name": "Blind Seer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Fighter",
            "Sage"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/blind_seer.png",
      "passives": [
        {
          "id": "preemptive_counter",
          "name": "Preemptive Counter",
          "trigger": "self.targetedByMeleeAttack",
          "text": "The first time each turn this unit is targeted by a melee attack, look at the top card of your deck. You may put it on the bottom. Then, this unit gains 2 armour before taking the damage.",
          "effects": [
            {
              "type": "lookTop",
              "count": 1,
              "optionalToBottom": true
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 2,
              "timing": "beforeDamage"
            }
          ],
          "script": null,
          "limits": {
            "firstTimeEachTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "predictive_strike",
          "name": "Predictive Strike",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free. Until the end of your opponent's next turn, the target deals 3 damage less on the first hit if it attacks.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            },
            {
              "type": "reduceDamageDealt",
              "target": "hitUnit",
              "amount": 3,
              "scope": "firstHit",
              "appliesTo": "itsAttacks",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null
        },
        {
          "id": "seers_visions",
          "name": "Seer's Visions",
          "cost": 2,
          "text": "Reveal the top card of your deck. If it is a unit card, use a 2AP ability or attack from among the promoted cards as this ability for free. Otherwise, draw that card and armour up to 4.",
          "effects": [
            {
              "type": "revealTop",
              "deck": "own",
              "count": 1
            },
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 2
              },
              "free": true,
              "asAP": 2,
              "if": "revealed.isUnit"
            },
            {
              "type": "draw",
              "card": "revealed",
              "if": "!revealed.isUnit"
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 4,
              "if": "!revealed.isUnit"
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "shadowguard",
      "set": "Realms of Man",
      "name": "Shadowguard",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight",
            "Assassin"
          ]
        ]
      },
      "hp": 29,
      "ap": 3,
      "art": "art/shadowguard.png",
      "passives": [
        {
          "id": "steal_plate",
          "name": "Steal Plate",
          "trigger": "self.attacks",
          "text": "When this unit attacks, it armours up to 1. If the target was armoured, it armours up to 3 instead.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 1,
              "modifiers": [
                {
                  "if": "target.wasArmoured",
                  "setUpTo": 3
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "dreadknight_smash",
          "name": "Dreadknight Smash",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free, except that attack deals an additional 1 damage on the first hit.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "addDamage": {
                "amount": 1,
                "scope": "firstHit"
              }
            }
          ],
          "script": null
        },
        {
          "id": "umbral_flail",
          "name": "Umbral Flail",
          "isMultiStage": true,
          "cost": 1,
          "text": "Deals 6 damage. If the target has an empty tile behind it, you may move this unit to that tile (ignoring units in the way).",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "place",
              "target": "self",
              "tile": "tileBehindTarget",
              "optional": true,
              "if": "tileBehindTarget.isEmpty",
              "ignoreUnitsInWay": true
            }
          ],
          "script": null,
          "target": "unit",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "tags": []
        }
      ],
      "classTags": []
    },
    {
      "id": "dreadnought_privateer", "set": "Realms of Man",
      "name": "Dreadnought Privateer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight",
            "Plunderer"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/dreadnought_privateer.png",
      "passives": [
        {
          "id": "iron_clout",
          "name": "Iron Clout",
          "trigger": "self.dealsOrTakesDamageToArmour",
          "text": "Once per turn, when this unit deals damage to armour or takes damage to its armour, Loot 1.",
          "effects": [
            {
              "type": "loot",
              "amount": 1
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "plundered_shield",
          "name": "Plundered Shield",
          "cost": 1,
          "text": "Armour up to 5.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 5
            }
          ]
        },
        {
          "id": "anchor_smash",
          "name": "Anchor Smash",
          "isMultiStage": true,
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free, except you may choose up to 2 additional targets. The attack also hits those targets. This attack does 1 damage less per hit for each target beyond the first.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "addTargets": {
                "max": 2
              },
              "addDamage": {
                "amount": {
                  "perExtraTarget": -1
                },
                "scope": "allHits"
              }
            }
          ],
          "script": null
        },
        {
          "id": "boarding_hook",
          "name": "Boarding Hook",
          "isMultiStage": true,
          "cost": 2,
          "text": "Place the target on the closest empty tile surrounding this unit (if there is more than one closest empty tile, choose one), then deal 6 damage. If the target has armour, remove up to 2 armour from it first.",
          "effects": [
            {
              "type": "place",
              "unit": "target",
              "tile": "closestEmptySurroundingSelf",
              "tiebreak": "controllerChooses"
            },
            {
              "type": "removeArmour",
              "target": "target",
              "amount": 2,
              "upTo": true,
              "if": "target.hasArmour"
            },
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "unit",
          "targetText": "targets unit",
          "range": [1, 3],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "magnetic_marauder", "set": "Realms of Man",
      "name": "Magnetic Marauder",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage"
          ],
          [
            "Plunderer"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/magnetic_marauder.png",
      "passives": [
        {
          "id": "magnetized_plunder",
          "name": "Magnetized Plunder",
          "trigger": "self.rangedAttackDamagesEnemyOrItsArmour",
          "text": "Once per turn, when a ranged attack from this unit deals damage to an enemy or its armour, Loot 2.",
          "effects": [
            {
              "type": "loot",
              "amount": 2
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "repulsion_spell",
          "name": "Repulsion Spell",
          "cost": 1,
          "text": "Use a 1AP ranged attack from among the promoted cards as this ability for free. You may have this attack apply knockback 1.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "ranged": true
              },
              "free": true,
              "optionalKnockback": 1
            }
          ],
          "script": null
        },
        {
          "id": "telekinetic_rend",
          "name": "Telekinetic Rend",
          "cost": 1,
          "text": "Remove up to 5 armour from the target and place that much armour on this unit. Then deals 1 damage per point of armour removed this way (as a single hit). Use only once per turn.",
          "effects": [
            {
              "type": "removeArmour",
              "target": "target",
              "amount": 5,
              "upTo": true,
              "id": "armourRemoved"
            },
            {
              "type": "armour",
              "target": "self",
              "amount": {
                "formula": "armourRemoved"
              }
            },
            {
              "type": "damage",
              "amount": {
                "formula": "armourRemoved"
              },
              "hits": 1
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "range": [1, 2],
          "rangeText": "1-2"
        }
      ],
      "classTags": []
    },
    {
      "id": "harsh_inquisitor", "set": "Realms of Man",
      "name": "Harsh Inquisitor",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Mage"
          ],
          [
            "Assassin"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/harsh_inquisitor.png",
      "passives": [
        {
          "id": "inscribed_edge",
          "name": "Inscribed Edge",
          "trigger": "static",
          "text": "The first time this unit makes an attack from the tile behind its target each turn, it deals an amount of additional damage equal to half the target's current armour on the first hit (rounded down).",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": {
                "formula": "floor(target.armour / 2)"
              },
              "scope": "firstHit",
              "if": "selfOnTileBehindTarget"
            }
          ],
          "script": null,
          "limits": {
            "firstQualifyingAttackEachTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "blink_strike",
          "name": "Blink Strike",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free, but treat it as though it were made from behind.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "treatAsFromBehind": true
            }
          ],
          "script": null,
          "target": "unit",
          "range": [1, 2],
          "rangeText": "1-2"
        },
        {
          "id": "runic_vanish",
          "name": "Runic Vanish",
          "cost": 2,
          "text": "Move this unit to the target tile. This unit gains 2 armour and cannot be targeted by enemy react effects until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 2
            },
            {
              "type": "cannotBeTargeted",
              "by": "enemyReactEffects",
              "target": "self",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "tile target",
          "range": [1, 2],
          "rangeText": "2"
        }
      ],
      "classTags": []
    },
    {
      "id": "heavy_cannoneer", "set": "Realms of Man",
      "name": "Heavy Cannoneer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight"
          ],
          [
            "Plunderer"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/heavy_cannoneer.png",
      "passives": [
        {
          "id": "fortified_bulwark",
          "name": "Fortified Bulwark",
          "trigger": "static",
          "text": "While this unit has 4 or more armour, its ranged attacks gain +1 Range.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "self",
              "appliesTo": "rangedAttacks",
              "addRange": 1,
              "if": "self.armour>=4"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "shrapnel_volley",
          "name": "Shrapnel Volley",
          "cost": 1,
          "text": "Use a 1AP ranged attack from among the promoted cards as this ability for free, then Loot 1.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "ranged": true
              },
              "free": true
            },
            {
              "type": "loot",
              "amount": 1
            }
          ],
          "script": null,
          "range": [1, 2],
          "rangeText": "2"
        },
        {
          "id": "human_cannonball",
          "name": "Human Cannonball",
          "cost": 2,
          "text": "Deals 8 damage to units on the target tile and 4 damage to units on all surrounding tiles. This unit gains 3 armour, but it cannot move until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "surroundingTargetTile"
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 3
            },
            {
              "type": "cannotMove",
              "target": "self",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [1, 2],
          "rangeText": "2"
        }
      ],
      "classTags": []
    },
    {
      "id": "prismatic_pikemen",
      "set": "Realms of Man",
      "name": "Prismatic Pikemen",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Fighter"
          ],
          [
            "Mage"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/prismatic_pikemen.png",
      "passives": [
        {
          "id": "elemental_wake",
          "name": "Elemental Wake",
          "trigger": "self.moves",
          "text": "Whenever this unit moves 2 or more tiles in a single turn, the last tile it left becomes scorched (units moving onto or off of a scorched tile take 4 damage) until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "scorchTile",
              "tile": "lastTileLeft",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4,
              "if": "self.tilesMovedThisTurn>=2"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "prismatic_slash",
          "name": "Prismatic Slash",
          "cost": 1,
          "text": "Deals 7 damage. If the target is currently standing on a scorched tile, this attack hits again for 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "extraHit": {
                "amount": 4,
                "if": "target.onScorchedTile",
                "checkedAfterHit": 1
              }
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "rainbow_geyser",
          "name": "Rainbow Geyser",
          "cost": 2,
          "text": "Deals 8 damage to units on the target tile, then that tile becomes scorched until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "scorchTile",
              "tile": "target",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2"
        }
      ],
      "classTags": []
    },
    {
      "id": "codex_defender",
      "set": "Realms of Man",
      "name": "Codex Defender",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight"
          ],
          [
            "Sage"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/codex_defender.png",
      "passives": [
        {
          "id": "tacticians_ledger",
          "name": "Tactician's Ledger",
          "trigger": "self.usesArmourAbility",
          "text": "Whenever this unit uses an armour ability, look at the top card of your deck. You may put it on the bottom.",
          "effects": [
            {
              "type": "lookTop",
              "count": 1,
              "optionalToBottom": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "prepared_shield",
          "name": "Prepared Shield",
          "cost": 1,
          "text": "Armour up to 6.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 6
            }
          ]
        },
        {
          "id": "scroll_bound_strike",
          "name": "Scroll-Bound Strike",
          "cost": 2,
          "text": "Deals 12 damage. Reveal the top 2 cards of your deck. You may put any of them back or on the bottom of your deck in any order.",
          "effects": [
            {
              "type": "damage",
              "amount": 12,
              "hits": 1
            },
            {
              "type": "revealTop",
              "deck": "own",
              "count": 2,
              "rearrange": "anyToTopOrBottomInAnyOrder"
            }
          ],
          "script": null,
          "tags": [
            "melee",
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "sparring_partners", "set": "Realms of Man",
      "name": "Sparring Partners",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Fighter"
          ],
          [
            "Knight"
          ]
        ]
      },
      "hp": 30,
      "ap": 3,
      "art": "art/sparring_partners.png",
      "passives": [
        {
          "id": "perfect_form",
          "name": "Perfect Form",
          "trigger": "multiple",
          "text": "Once per turn, after this unit uses an armour ability, its next attack this turn deals an additional 2 damage. Once per turn, after this unit uses an attack, its next armour ability this turn grants an additional 1 armour.",
          "effects": [
            {
              "trigger": "self.usesArmourAbility",
              "limits": {
                "oncePerTurn": true
              },
              "type": "buffNextAttack",
              "target": "self",
              "addDamage": {
                "amount": 2,
                "scope": "allHits"
              },
              "duration": "thisTurn"
            },
            {
              "trigger": "self.usesAttack",
              "limits": {
                "oncePerTurn": true
              },
              "type": "buffNextArmourAbility",
              "target": "self",
              "addArmour": 1,
              "duration": "thisTurn"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "feint_and_counter",
          "name": "Feint and Counter",
          "cost": 1,
          "text": "Use a 1AP attack from among the promoted cards as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            }
          ],
          "script": null
        },
        {
          "id": "guard_break",
          "name": "Guard Break",
          "cost": 1,
          "text": "Use a 1AP armour ability from among the promoted cards as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "armourAbility"
              },
              "free": true
            }
          ],
          "script": null
        },
        {
          "id": "buddy_tag",
          "name": "Buddy Tag",
          "isMultiStage": true,
          "cost": 1,
          "text": "This unit switches positions with a surrounding friendly unit.",
          "effects": [
            {
              "type": "swapPositions",
              "units": [
                "self",
                "chosenFriendlyUnitSurroundingSelf"
              ]
            }
          ],
          "script": null,
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "elite_sniper",
      "set": "Realms of Man",
      "name": "Elite Sniper",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Assassin"
          ],
          [
            "Fighter"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/elite_sniper.png",
      "passives": [
        {
          "id": "lock",
          "name": "Lock",
          "trigger": "static",
          "text": "When this unit attacks a unit, if it has already attacked that unit this turn, it deals an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "target.attackedBySelfThisTurn"
            }
          ]
        },
        {
          "id": "stock",
          "name": "Stock",
          "trigger": "static",
          "text": "When this unit attacks a target in melee range, that attack hits again dealing 3 damage.",
          "effects": [
            {
              "type": "extraHit",
              "amount": 3,
              "if": "target.inMeleeRange"
            }
          ]
        },
        {
          "id": "barrel",
          "name": "Barrel",
          "trigger": "static",
          "text": "When this unit attacks a target that is the first unit in a straight line, it deals an additional 1 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 1,
              "scope": "firstHit",
              "if": "target.firstUnitInStraightLine"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "fire",
          "name": "Fire!",
          "cost": 1,
          "text": "Deals 3 damage.",
          "range": [
            1,
            4
          ],
          "rangeText": "1-4",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "warden_of_the_gate", "set": "Realms of Man",
      "name": "Warden of the Gate",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Knight"
          ],
          [
            "Sage"
          ]
        ]
      },
      "hp": 28,
      "ap": 3,
      "art": "art/warden_of_the_gate.png",
      "passives": [
        {
          "id": "sealed_gate",
          "name": "Sealed Gate",
          "trigger": "static",
          "text": "The enemy player cannot Reinforce onto a tile within range 1 of this unit.",
          "effects": [
            {
              "type": "forbidReinforce",
              "player": "enemy",
              "tiles": "withinRange:1OfSelf"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "detain",
          "name": "Detain",
          "cost": 1,
          "text": "Use a 1AP attack from among the promoted cards as this ability for free. The first unit hit by this attack each turn cannot move until the end of your opponent's next turn (it may still use other abilities).",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true
            },
            {
              "type": "cannotMove",
              "target": "firstUnitHitByThisAbilityEachTurn",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "script": null
        },
        {
          "id": "foreknowledge",
          "name": "Foreknowledge",
          "cost": 1,
          "text": "Your opponent reveals the top card of their deck. You may have them put it on the bottom of their deck. Use only once per turn.",
          "effects": [
            {
              "type": "revealTop",
              "deck": "enemy",
              "count": 1,
              "optionalToBottomByYou": true
            }
          ],
          "script": null,
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "classTags": []
    },
    {
      "id": "simian_sovereign",
      "set": "Realms of Man",
      "name": "Simian Sovereign",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": []
      },
      "hp": 29,
      "ap": 4,
      "art": "art/simian_sovereign.png",
      "passives": [
        {
          "id": "leader_of_the_bunch",
          "name": "Leader of the Bunch",
          "trigger": "static",
          "text": "This unit gets an additional 1HP for each friendly unit surrounding it (if a friendly unit is no longer surrounding it, it loses the HP again).",
          "effects": [
            {
              "type": "modifyHP",
              "target": "self",
              "amount": {
                "perFriendlyUnitSurroundingSelf": 1
              }
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "bananarang",
          "name": "Bananarang",
          "cost": 1,
          "usesPath": true,
          "pathLength": 3,
          "range": [
            3,
            3
          ],
          "rangeText": "3",
          "target": "tile",
          "targetText": "3-tile path",
          "text": "Deals 4 damage to each unit on the path (including the unit on the target tile, if there is one). Hits twice. Use only once each turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2,
              "area": "allUnitsOnPath"
            }
          ],
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "ape_attack",
          "name": "Ape Attack",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 8 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            }
          ]
        },
        {
          "id": "monkey_smash",
          "name": "Monkey Smash",
          "cost": 2,
          "text": "Deals 14 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 14,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "cannon_squadron",
      "set": "Realms of Man",
      "name": "Cannon Squadron",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Knight",
            "Plunderer"
          ]
        ]
      },
      "hp": 34,
      "ap": 4,
      "art": "art/cannon_squadron.png",
      "passives": [
        {
          "id": "siege_engine",
          "name": "Siege Engine",
          "trigger": "multiple",
          "text": "At the start of each player's turn, this unit armours up to 1. While armoured, this unit is immune to knockback.",
          "effects": [
            {
              "trigger": "turnStart",
              "type": "armour",
              "target": "self",
              "upTo": 1
            },
            {
              "trigger": "static",
              "type": "immune",
              "to": "knockback",
              "target": "self",
              "if": "self.hasArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "fend_off",
          "name": "Fend Off",
          "cost": 1,
          "text": "Use 2 different 1AP abilities from among the promoted cards as this ability for free. Attacks chosen this way must be legal against the target. If this ability has already been used this turn, instead only use 1 ability this way.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1
              },
              "free": true,
              "times": 2,
              "distinct": true,
              "attacksMustBeLegalAgainstTarget": true,
              "modifiers": [
                {
                  "if": "thisAbilityUsedEarlierThisTurn",
                  "setTimes": 1
                }
              ]
            }
          ],
          "script": null,
          "range": [
            1,
            1
          ],
          "rangeText": "1"
        },
        {
          "id": "full_bore",
          "name": "Full Bore",
          "cost": 3,
          "text": "This ability deals less damage equal to the number of tiles between this unit and the unit hit. Deals 19 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "formula": "19 - tilesBetweenSelfAndUnitHit"
              },
              "hits": 1,
              "area": "firstUnitInStraightLine"
            }
          ],
          "straightLine": true,
          "target": "direction",
          "targetText": "Choose a direction. Hits first unit in a straight line"
        }
      ],
      "classTags": []
    },
    {
      "id": "anima_magi",
      "set": "Realms of Man",
      "name": "Anima Magi",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Mage",
            "Sage"
          ]
        ]
      },
      "hp": 28,
      "ap": 4,
      "art": "art/anima_magi.png",
      "passives": [
        {
          "id": "magical_omnipresence",
          "name": "Magical Omnipresence",
          "trigger": "static",
          "text": "This unit may only move once per turn, but it may move to any empty tile within Range 2 (ignoring units in the way).",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "maxMovesPerTurn": 1,
              "moveToAnyEmptyTileWithinRange": 2,
              "ignoreUnitsInWay": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "destructive_arcana",
          "name": "Destructive Arcana",
          "cost": 1,
          "text": "Use a 1AP attack from among the promoted units as this ability for free, except it deals an additional 1 damage on the first hit for each time this ability has previously been used this turn.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "addDamage": {
                "amount": {
                  "perPreviousUseThisTurn": 1
                },
                "scope": "firstHit"
              }
            }
          ],
          "script": null,
          "tags": []
        },
        {
          "id": "arcane_lightning_bolt",
          "name": "Arcane Lightning Bolt",
          "cost": 3,
          "text": "Deals 16 damage to units on the target tile and 7 damage to each enemy unit surrounding it.",
          "effects": [
            {
              "type": "damage",
              "amount": 16,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "area": "enemyUnitsSurroundingTargetTile"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "targets tile",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3"
        }
      ],
      "classTags": []
    },
    {
      "id": "renegade_trio",
      "set": "Realms of Man",
      "name": "Renegade Trio",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Fighter",
            "Assassin"
          ]
        ]
      },
      "hp": 33,
      "ap": 4,
      "art": "art/renegade_trio.png",
      "passives": [
        {
          "id": "rabble_rouse",
          "name": "Rabble Rouse",
          "trigger": "static",
          "text": "This unit may move over enemy units while moving. Moving onto another unit's tile this way deals 4 damage to it. After doing this, move this unit to an empty tile surrounding it for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "enemy",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "damage",
                  "target": "otherUnitOnTile",
                  "amount": 4
                }
              ]
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "triple_fillet",
          "name": "Triple Fillet",
          "cost": 1,
          "text": "Deals 2 damage. Hits 3 times. Use up to 3 times per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ],
          "limits": {
            "maxPerTurn": 3
          }
        },
        {
          "id": "villainous_combo",
          "name": "Villainous Combo",
          "cost": 3,
          "text": "Choose three different 1AP attacks from among the promoted cards. Use them as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "times": 3,
              "distinct": true,
              "chooseFirst": true
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "faceless_king",
      "set": "Realms of Man",
      "name": "Faceless King",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "*"
          ]
        ]
      },
      "hp": 30,
      "ap": 4,
      "art": "art/faceless_king.png",
      "passives": [
        {
          "id": "perfect_synthesis",
          "name": "Perfect Synthesis",
          "trigger": "self.comesIntoPlay",
          "text": "Choose a passive from among the promoted cards as this unit comes into play. This unit has that passive.",
          "effects": [
            {
              "type": "copyPassive",
              "from": "promotedCards",
              "choose": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "royal_splash",
          "name": "Royal Splash",
          "cost": 1,
          "text": "Deals 10 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 10,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          }
        },
        {
          "id": "grand_metamorphosis",
          "name": "Grand Metamorphosis",
          "cost": 3,
          "text": "Choose up to 1 attack and up to 2 different non-attack abilities from among the promoted cards costing a maximum of 3AP total. Use them as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "free": true,
              "choose": {
                "attacks": {
                  "max": 1
                },
                "nonAttackAbilities": {
                  "max": 2,
                  "distinct": true
                }
              },
              "totalCostMax": 3
            }
          ],
          "script": null
        }
      ],
      "classTags": []
    },
    {
      "id": "the_cyclotron",
      "set": "Realms of Man",
      "name": "The Cyclotron",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Cook",
            "Engineer",
            "Camper",
            "Correspondent"
          ]
        ]
      },
      "hp": 36,
      "ap": 4,
      "art": "art/the_cyclotron.png",
      "passives": [
        {
          "id": "machine_heart",
          "name": "Machine Heart",
          "trigger": "static",
          "text": "This unit is immune to non-damage effects. If it has taken damage this turn, this passive has no effect until the end of the turn.",
          "effects": [
            {
              "type": "immune",
              "to": "nonDamageEffects",
              "target": "self",
              "unless": "self.tookDamageThisTurn"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "coin_plink",
          "name": "Coin Plink",
          "isMultiStage": true,
          "cost": 1,
          "text": "Deals 1 damage. Hits 3 times. If this attack kills the target, target another enemy unit within Range 1-4. Use this ability again against that unit, ignoring its AP cost (each time this happens counts as a another ability).",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 3
            },
            {
              "type": "repeatAbility",
              "if": "targetKilled",
              "newTarget": "anotherEnemyWithinRange:1-4",
              "ignoreCost": true,
              "countsAsAdditionalAbility": true
            }
          ],
          "script": null,
          "tags": [
            "assist"
          ],
          "target": "unit",
          "range": [
            1,
            4
          ],
          "rangeText": "1-4"
        },
        {
          "id": "cycle_through",
          "name": "Cycle Through",
          "cost": 1,
          "text": "Choose a 1AP ability from among the promoted cards that has not yet been chosen this way this turn. Use that ability as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1
              },
              "free": true,
              "distinctPerTurn": true
            }
          ],
          "script": null
        },
        {
          "id": "fatal_error",
          "name": "Fatal Error!",
          "cost": 0,
          "text": "Deals 77 damage. Use this ability only as this unit's 7th action in a turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 77,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ],
          "requires": "thisIsNthActionOfTurn:7"
        }
      ],
      "classTags": []
    },
    {
      "id": "frozen_knight",
      "set": "Wrath of the Elements",
      "name": "Frozen Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/frozen_knight.png",
      "passives": [
        {
          "id": "frozen_in_place",
          "name": "Frozen in Place",
          "trigger": "static",
          "text": "This unit cannot be knocked back while armoured.",
          "effects": [
            {
              "type": "immune",
              "to": "knockback",
              "target": "self",
              "if": "self.hasArmour"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "chilling_lance",
          "name": "Chilling Lance",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 7 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ]
        },
        {
          "id": "iceshell_stance",
          "name": "Iceshell Stance",
          "cost": 1,
          "tags": [
            "inspiring"
          ],
          "text": "Armour up to 7. This unit cannot move until the start of your next turn.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 7
            },
            {
              "type": "cannotMove",
              "target": "self",
              "duration": "untilStartOfYourNextTurn"
            }
          ]
        }
      ],
      "classTags": [
        "Frozen",
        "Knight"
      ]
    },
    {
      "id": "frozen_fighter",
      "set": "Wrath of the Elements",
      "name": "Frozen Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/frozen_fighter.png",
      "passives": [
        {
          "id": "relentless_rage",
          "name": "Relentless Rage",
          "trigger": "static",
          "text": "If this unit would take damage on a turn when it has killed an enemy unit, reduce that damage to 1.",
          "effects": [
            {
              "type": "reduceDamage",
              "target": "self",
              "setTo": 1,
              "per": "hit",
              "from": "any",
              "if": "self.killedEnemyThisTurn"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "cruel_mace",
          "name": "Cruel Mace",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 7 damage. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ]
        },
        {
          "id": "berserkers_cleave",
          "name": "Berserker's Cleave",
          "cost": 2,
          "tags": [
            "melee"
          ],
          "text": "Deals 6 damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "classTags": [
        "Frozen",
        "Fighter"
      ]
    },
    {
      "id": "frozen_lancer",
      "set": "Wrath of the Elements",
      "name": "Frozen Lancer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 19,
      "ap": 2,
      "art": "art/frozen_lancer.png",
      "passives": [
        {
          "id": "momentum_slide",
          "name": "Momentum Slide",
          "trigger": "self.firstMoveOnOwnTurn",
          "text": "The first time this unit moves on its turn, it may move an additional tile in the same direction for free.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "extraTiles": 1,
              "direction": "same",
              "optional": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "lance_thrust",
          "name": "Lance Thrust",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "This attack deals an additional damage for each tile this unit has moved this turn. Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "addAmount": {
                    "perTileMovedThisTurn": 1
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "ready_deflection",
          "name": "Ready Deflection",
          "cost": 1,
          "text": "If this unit has less than 2 armour, armour up to 2. If not, it gains 1 armour.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2,
              "otherwiseGain": 1
            }
          ]
        }
      ],
      "classTags": [
        "Frozen", "Lancer"
      ]
    },
    {
      "id": "frozen_golem",
      "set": "Wrath of the Elements",
      "name": "Frozen Golem",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/frozen_golem.png",
      "passives": [
        {
          "id": "freezing_shell",
          "name": "Freezing Shell",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 2.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "icicle_one_two",
          "name": "Icicle One-Two",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage. Then, hits again for 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": {
                "amount": 2
              }
            }
          ]
        },
        {
          "id": "chilly_slam",
          "name": "Chilly Slam",
          "cost": 2,
          "tags": [
            "melee"
          ],
          "text": "Deals 7 damage. If the target takes the next turn, moving costs an additional 1AP first time it moves that turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "increaseMoveCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstMoveOfTurn",
              "duration": "nextTurnIfTargetTakesIt"
            }
          ]
        }
      ],
      "classTags": [
        "Frozen"
      ]
    },
    {
      "id": "frozen_wildcat",
      "set": "Wrath of the Elements",
      "name": "Frozen Wildcat",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/frozen_wildcat.png",
      "passives": [
        {
          "id": "thick_fur",
          "name": "Thick Fur",
          "trigger": "static",
          "text": "This unit takes 1 damage less from melee attacks, to a minimum of 1.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "meleeAttack",
              "per": "attack",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "chilling_fang",
          "name": "Chilling Fang",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 3 damage. If the target takes the next turn, it must spend an additional 1AP on its first action that turn. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1
            },
            {
              "type": "increaseActionCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstActionOfTurn",
              "duration": "nextTurnIfTargetTakesIt"
            }
          ]
        },
        {
          "id": "pouncing_ambush",
          "name": "Pouncing Ambush",
          "cost": 2,
          "tags": [
            "inspiring"
          ],
          "target": "tile",
          "targetText": "straight-line move, then a melee target",
          "text": "This unit moves up to 2 tiles in a straight line. Then, choose an enemy target in melee range. Deals 9 damage.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 2
              },
              "straightLine": true
            },
            {
              "type": "damage",
              "amount": 9,
              "hits": 1,
              "target": "chosenEnemyInMeleeRange"
            }
          ]
        }
      ],
      "classTags": [
        "Frozen",
        "Wildcat"
      ]
    },
    {
      "id": "flaming_fighter", "set": "Wrath of the Elements", "name": "Flaming Fighter", "type": "unit", "basic": true,
      "reinforce": { "mode": "basic" }, "hp": 18, "ap": 2, "art": "art/flaming_fighter.png",
      "passives": [
        { "id": "scorching_tempo", "name": "Scorching Tempo", "trigger": "self.attacksSameUnitTwiceInTurn",
          "text": "If this unit attacks the same unit twice in a turn, the tile the target is on becomes scorched until the end of your opponent's next turn (a unit moving onto or off of a scorched tile takes 4 damage).",
          "effects": [{ "type": "scorchTile", "tile": "targetTile", "duration": "untilEndOfOpponentNextTurn", "damage": 4 }], "script": null }
      ],
      "abilities": [
        { "id": "torch_beating", "name": "Torch Beating", "cost": 1, "tags": ["melee"],
          "text": "Deals 2 damage. Hits 3 times.",
          "effects": [{ "type": "damage", "amount": 2, "hits": 3 }] },
        { "id": "leap_strike", "name": "Leap Strike", "cost": 1, "range": [1, 1], "rangeText": "1", "target": "emptyTile",
          "targetText": "move 1 tile", "limits": { "oncePerTurn": true },
          "text": "Move 1 tile. Then, if there is an enemy unit in the direction moved, this unit deals 6 damage to it. Use only once per turn.",
          "effects": [
            { "type": "move", "target": "self", "tile": "target" },
            { "type": "damage", "amount": 6, "hits": 1, "target": "enemyInDirectionMoved" }
          ] }
      ],
      "classTags": ["Flaming", "Fighter"]
    },
    {
      "id": "flaming_mage", "set": "Wrath of the Elements", "name": "Flaming Mage", "type": "unit", "basic": true,
      "reinforce": { "mode": "basic" }, "hp": 15, "ap": 2, "art": "art/flaming_mage.png",
      "passives": [
        { "id": "burning_barrier", "name": "Burning Barrier", "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 1 }], "script": null }
      ],
      "abilities": [
        { "id": "ruby_ray", "name": "Ruby Ray", "cost": 1, "straightLine": true, "target": "direction",
          "targetText": "Choose a direction. Hits first unit in a straight line",
          "text": "Deals 5 damage.",
          "effects": [{ "type": "damage", "amount": 5, "hits": 1, "area": "firstUnitInStraightLine" }] },
        { "id": "flame_geyser", "name": "Flame Geyser", "cost": 2, "range": [1, 3], "rangeText": "1-3", "target": "unit",
          "text": "Deals 4 damage. The tile the target is on becomes scorched until the end of your opponent's next turn (a unit moving onto or off of a scorched tile takes 4 damage).",
          "effects": [
            { "type": "damage", "amount": 4, "hits": 1 },
            { "type": "scorchTile", "tile": "targetTile", "duration": "untilEndOfOpponentNextTurn", "damage": 4 }
          ] }
      ],
      "classTags": ["Flaming", "Mage"]
    },
    {
      "id": "flaming_salamander",
      "set": "Wrath of the Elements",
      "name": "Flaming Salamander",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/flaming_salamander.png",
      "passives": [
        {
          "id": "slithering_advance",
          "name": "Slithering Advance",
          "trigger": "self.movesOnOwnTurn",
          "text": "Any time this unit moves on its turn, it may move an additional tile in a different direction.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "extraTiles": 1,
              "direction": "different",
              "optional": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "burning_claws",
          "name": "Burning Claws",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ]
        },
        {
          "id": "lava_spit",
          "name": "Lava Spit",
          "cost": 1,
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Flaming"
      ]
    },
    {
      "id": "flaming_drakeling",
      "set": "Wrath of the Elements",
      "name": "Flaming Drakeling",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/flaming_drakeling.png",
      "passives": [
        {
          "id": "regal_wings",
          "name": "Regal Wings",
          "trigger": "static",
          "text": "This unit takes 2 damage less per attack from ranged attacks, to a minimum of 1 damage per attack.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 2,
              "target": "self",
              "from": "rangedAttack",
              "per": "attack",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "firebrand_talons",
          "name": "Firebrand Talons",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ]
        },
        {
          "id": "fledgling_flight",
          "name": "Fledgling Flight",
          "cost": 1,
          "tags": [
            "inspiring"
          ],
          "text": "This unit moves 2 tiles, changing direction exactly once but not turning back the way it came. It may move over units this way, and doing so deals 4 damage to each of those units. This ability must leave this unit alone on its tile. Use only once per turn.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "path": {
                "directionChanges": 1,
                "noReversal": true
              },
              "mayMoveOverUnits": true,
              "damageToUnitsMovedOver": 4,
              "finalTileMustBeEmpty": true
            }
          ],
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "classTags": [
        "Flaming",
        "Drakeling"
      ]
    },
    {
      "id": "flaming_ooze", "set": "Wrath of the Elements", "name": "Flaming Ooze", "type": "unit", "basic": true,
      "reinforce": { "mode": "basic" }, "hp": 19, "ap": 2, "art": "art/flaming_ooze.png",
      "passives": [
        { "id": "lava_barrier", "name": "Lava Barrier", "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 1 }], "script": null }
      ],
      "abilities": [
        { "id": "flaming_splash", "name": "Flaming Splash", "cost": 1, "tags": ["melee"],
          "text": "Deals 3 damage. Then, hits again dealing 2 damage.",
          "effects": [{ "type": "damage", "amount": 3, "hits": 1, "extraHit": { "amount": 2 } }] },
        { "id": "intense_radiation", "name": "Intense Radiation", "cost": 1,
          "text": "Deals 5 damage to all surrounding units (including friendly units).",
          "effects": [{ "type": "damage", "amount": 5, "hits": 1, "area": "allUnitsSurroundingSelf" }] }
      ],
      "classTags": ["Flaming", "Ooze"]
    },
    {
      "id": "plant_mage", "set": "Wrath of the Elements", "name": "Plant Mage", "type": "unit", "basic": true,
      "reinforce": { "mode": "basic" }, "hp": 15, "ap": 2, "art": "art/plant_mage.png",
      "passives": [
        { "id": "leaf_cover", "name": "Leaf Cover", "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 1 }], "script": null }
      ],
      "abilities": [
        { "id": "jade_burst", "name": "Jade Burst", "cost": 1, "range": [1, 3], "rangeText": "1-3", "target": "tile",
          "targetText": "targets tile", "limits": { "oncePerTurn": true },
          "text": "Deals 4 damage to enemy units on the target tile and 3 damage to enemy units surrounding it. Use only once per turn.",
          "effects": [
            { "type": "damage", "amount": 4, "hits": 1, "area": "enemyUnitsOnTargetTile" },
            { "type": "damage", "amount": 3, "hits": 1, "area": "enemyUnitsSurroundingTargetTile" }
          ] },
        { "id": "strangling_brambles", "name": "Strangling Brambles", "cost": 2, "tags": ["melee"],
          "text": "Deals 8 damage. If the target takes the next turn, moving costs an additional 1AP the first time it moves that turn.",
          "effects": [
            { "type": "damage", "amount": 8, "hits": 1 },
            { "type": "increaseMoveCost", "target": "hitUnit", "amount": 1, "scope": "firstMoveOfTurn", "duration": "nextTurnIfTargetTakesIt" }
          ] }
      ],
      "classTags": ["Plant", "Mage"]
    },
    {
      "id": "plant_knight", "set": "Wrath of the Elements", "name": "Plant Knight", "type": "unit", "basic": true,
      "reinforce": { "mode": "basic" }, "hp": 22, "ap": 2, "art": "art/plant_knight.png",
      "passives": [
        { "id": "regrowing_armour", "name": "Regrowing Armour", "trigger": "self.armourBroken",
          "text": "Whenever this unit is armoured and takes damage leaving it without armour, it armours up to 1 after the damage.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 1, "timing": "afterDamage" }], "script": null }
      ],
      "abilities": [
        { "id": "thorn_bludgeon", "name": "Thorn Bludgeon", "cost": 1, "tags": ["melee"],
          "text": "Deals 4 damage. Gain 2 armour.",
          "effects": [{ "type": "damage", "amount": 4, "hits": 1 }, { "type": "armour", "target": "self", "amount": 2 }] },
        { "id": "green_execution", "name": "Green Execution", "cost": 2, "tags": ["melee", "inspiring"],
          "text": "Deals 11 damage. If this attack would kill a unit, it leaves that unit alive at 1HP instead.",
          "effects": [{ "type": "damage", "amount": 11, "hits": 1, "nonLethal": true }] }
      ],
      "classTags": ["Plant", "Knight"]
    },
    {
      "id": "plant_lasher",
      "set": "Wrath of the Elements",
      "name": "Plant Lasher",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/plant_lasher.png",
      "passives": [
        {
          "id": "insidious_weed",
          "name": "Insidious Weed",
          "trigger": "static",
          "text": "Damage dealt to this unit is reduced by 1 to a minimum of 1 damage.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "per": "hit",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "thrash_and_flail",
          "name": "Thrash and Flail",
          "cost": 1,
          "text": "Deals 4 damage to all surrounding units and applies knockback 1 to them.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            },
            {
              "type": "knockback",
              "target": "areaHitUnits",
              "distance": 1
            }
          ]
        },
        {
          "id": "squeeze_tight",
          "name": "Squeeze Tight",
          "cost": 2,
          "tags": [
            "melee"
          ],
          "text": "Deals 8 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit (they must choose a different non-token unit if able).",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            },
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "if": "target.tookLastTurn",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ]
        }
      ],
      "classTags": [
        "Plant"
      ]
    },
    {
      "id": "noxious_plant",
      "set": "Wrath of the Elements",
      "name": "Noxious Plant",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 19,
      "ap": 2,
      "art": "art/noxious_plant.png",
      "passives": [
        {
          "id": "spore_burst",
          "name": "Spore Burst",
          "trigger": "self.killsUnitWithRangedAttack",
          "text": "When this unit kills another unit with a ranged attack, it deals 4 damage to all units that were surrounding the target.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "unitsSurroundingDestroyedTile"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "poison_spray",
          "name": "Poison Spray",
          "cost": 1,
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "text": "Deals 3 damage. Hits twice. The first hit bypasses armour.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2,
              "firstHitBypassesArmour": true
            }
          ]
        },
        {
          "id": "toxic_darts",
          "name": "Toxic Darts",
          "cost": 1,
          "tags": [],
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "text": "Deals 3 damage. Then, hits again dealing 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": {
                "amount": 2
              }
            }
          ]
        }
      ],
      "classTags": [
        "Plant"
      ]
    },
    {
      "id": "jaw_plant", "set": "Wrath of the Elements", "name": "Jaw Plant", "type": "unit", "basic": true,
      "reinforce": { "mode": "basic" }, "hp": 20, "ap": 2, "art": "art/jaw_plant.png",
      "passives": [
        { "id": "trapping_teeth", "name": "Trapping Teeth", "trigger": "self.hitByMeleeAttack",
          "text": "When this unit is hit by a melee attack, the attacker cannot move during your opponent's next turn.",
          "effects": [{ "type": "cannotMove", "target": "attacker", "duration": "untilEndOfAttackersTurn" }], "script": null }
      ],
      "abilities": [
        { "id": "swift_bite", "name": "Swift Bite", "cost": 1, "tags": ["melee"], "limits": { "oncePerTurn": true },
          "text": "Deals 7 damage. Use only once per turn.",
          "effects": [{ "type": "damage", "amount": 7, "hits": 1 }] },
        { "id": "chew_up", "name": "Chew Up", "cost": 1, "tags": ["melee"], "requires": "target.attackedBySelfThisTurn",
          "text": "Deals 5 damage. Use only against targets that this unit has already attacked this turn.",
          "effects": [{ "type": "damage", "amount": 5, "hits": 1 }] }
      ],
      "classTags": [
	"Plant"
	]
    },
    {
      "id": "abominable_snowman", "set": "Wrath of the Elements", "name": "Abominable Snowman", "type": "unit", "basic": false,
      "reinforce": { "mode": "promote", "requirement": [["Frozen"]] }, "hp": 24, "ap": 3, "art": "art/abominable_snowman.png",
      "passives": [],
      "abilities": [
        { "id": "snowy_haymaker", "name": "Snowy Haymaker", "cost": 1, "tags": ["melee"], "limits": { "oncePerTurn": true },
          "text": "Deals 10 damage. This unit takes 2 damage. Use only once per turn.",
          "effects": [{ "type": "damage", "amount": 10, "hits": 1 }, { "type": "damage", "target": "self", "amount": 2, "hits": 1 }] },
        { "id": "ice_block_throw", "name": "Ice Block Throw", "cost": 2, "range": [1, 3], "rangeText": "1-3", "target": "unit",
          "text": "Deals 12 damage.",
          "effects": [{ "type": "damage", "amount": 12, "hits": 1 }] },
        { "id": "avalanche", "name": "Avalanche", "cost": 3, "tags": ["melee"], "range": [1, 1], "rangeText": "1", "target": "unit",
          "text": "Deals 18 damage and 6 damage to all units surrounding the target (including this one and any other friendly units).",
          "effects": [
            { "type": "damage", "amount": 18, "hits": 1, "area": "targetTile" },
            { "type": "damage", "amount": 6, "hits": 1, "area": "surroundingTargetTile" }
          ] }
      ],
      "classTags": []
    },
    {
      "id": "frostbreath_howler",
      "set": "Wrath of the Elements",
      "name": "Frostbreath Howler",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Frozen"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/frostbreath_howler.png",
      "passives": [
        {
          "id": "burst_through",
          "name": "Burst Through",
          "trigger": "self.meleeAttacksSameUnitTwiceInTurn",
          "text": "When this unit uses a melee attack on the same unit for the second time in a turn, apply knockback 1 to the target.",
          "effects": [
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "horn_gouge",
          "name": "Horn Gouge",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ]
        },
        {
          "id": "icy_wind_tunnel",
          "name": "Icy Wind Tunnel",
          "cost": 2,
          "tags": [
            "inspiring"
          ],
          "usesPath": true,
          "pathRule": "straight",
          "pathLength": 2,
          "range": [
            2,
            2
          ],
          "rangeText": "2",
          "target": "tile",
          "targetText": "straight line",
          "text": "Deals 12 damage to all units along the path.",
          "effects": [
            {
              "type": "damage",
              "amount": 12,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "burning_rager",
      "set": "Wrath of the Elements",
      "name": "Burning Rager",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Flaming"
          ]
        ]
      },
      "hp": 20,
      "ap": 3,
      "art": "art/burning_rager.png",
      "passives": [
        {
          "id": "burn_fuel",
          "name": "Burn Fuel",
          "trigger": "self.dealsDamageFirstTimeEachTurn",
          "text": "Whenever this unit deals damage for the first time each turn, it heals up to 2 damage.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": 2
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "controlled_burn",
          "name": "Controlled Burn",
          "cost": 1,
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "text": "This attack deals 2 damage less for each time it was previously used this turn, to a minimum of 1 damage. Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "modifiers": [
                {
                  "addAmount": {
                    "perPreviousUseThisTurn": -2
                  },
                  "minAmount": 1
                }
              ]
            }
          ]
        },
        {
          "id": "flamethrower",
          "name": "Flamethrower",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 4 damage. Hits twice. The tile the target is on becomes scorched until the end of your opponent's next turn. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            },
            {
              "type": "scorchTile",
              "tile": "targetTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "lava_elemental", "set": "Wrath of the Elements", "name": "Lava Elemental", "type": "unit", "basic": false,
      "reinforce": { "mode": "promote", "requirement": [["Flaming"]] }, "hp": 24, "ap": 3, "art": "art/lava_elemental.png",
      "passives": [
        { "id": "hot_to_the_touch", "name": "Hot to the Touch", "trigger": "self.takesDamageFromMeleeAttack",
          "text": "When this unit takes damage from a melee attack, the attacker takes 3 damage.",
          "effects": [{ "type": "damage", "target": "attacker", "amount": 3 }], "script": null }
      ],
      "abilities": [
        { "id": "singeing_strike", "name": "Singeing Strike", "cost": 1, "tags": ["melee"],
          "text": "Deals 6 damage.",
          "effects": [{ "type": "damage", "amount": 6, "hits": 1 }] },
        { "id": "burning_barrier_wall", "name": "Burning Barrier", "cost": 2, "tags": ["inspiring"],
          "text": "All tiles surrounding this unit become scorched until the end of your next turn.",
          "effects": [{ "type": "scorchTiles", "tiles": "surroundingSelf", "duration": "untilEndOfYourNextTurn", "damage": 4 }] }
      ],
      "classTags": []
    },
    {
      "id": "hungering_overgrowth",
      "set": "Wrath of the Elements",
      "name": "Hungering Overgrowth",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Plant"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/hungering_overgrowth.png",
      "passives": [
        {
          "id": "draining_touch",
          "name": "Draining Touch",
          "trigger": "self.usesMeleeAttack",
          "text": "When this unit uses a melee attack, it heals 1 damage per hit (no matter how many units are hit).",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": {
                "perAttackHit": 1
              }
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "chaotic_vines",
          "name": "Chaotic Vines",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Choose a 1AP melee attack of the promoted unit that has not yet been chosen this way this turn. Use it as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true,
              "distinctPerTurn": true
            }
          ]
        },
        {
          "id": "extreme_lashing",
          "name": "Extreme Lashing",
          "cost": 3,
          "tags": [
            "melee"
          ],
          "text": "Deals 3 damage to all surrounding units. Hits 3 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 3,
              "area": "allUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "seed_bombardier",
      "set": "Wrath of the Elements",
      "name": "Seed Bombardier",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Plant"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/seed_bombardier.png",
      "passives": [
        {
          "id": "settle_roots",
          "name": "Settle Roots",
          "trigger": "static",
          "text": "This unit's ranged attacks deal an additional 1 damage per hit to all units damaged if it has not moved this turn.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownRangedAttacks",
              "amount": 1,
              "scope": "allHits",
              "if": "self.hasNotMovedThisTurn"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "push_away",
          "name": "Push Away",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Deals 4 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ]
        },
        {
          "id": "seed_bomb",
          "name": "Seed Bomb",
          "cost": 1,
          "tags": [],
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "tile",
          "targetText": "targets tile",
          "text": "Deals 4 damage to units on the target tile and 2 damage to all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "surroundingTargetTile"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "voracious_firemaw",
      "set": "Wrath of the Elements",
      "name": "Voracious Firemaw",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 2,
        "requirement": [
          [
            "Flaming"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/voracious_firemaw.png",
      "passives": [
        {
          "id": "blazing_wings",
          "name": "Blazing Wings",
          "trigger": "static",
          "text": "This unit takes 3 damage less per attack from ranged attacks, to a minimum of 1 damage per attack.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 3,
              "target": "self",
              "from": "rangedAttack",
              "per": "attack",
              "minDamage": 1
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "fiery_claws",
          "name": "Fiery Claws",
          "cost": 1,
          "tags": [
            "melee",
            "inspiring"
          ],
          "text": "Deals 4 damage. Hits twice. The tile the target is on becomes scorched until the end of your opponent's next turn (a unit moving onto or off of a scorched tile takes 4 damage).",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            },
            {
              "type": "scorchTile",
              "tile": "targetTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        },
        {
          "id": "belch_flames",
          "name": "Belch Flames",
          "cost": 1,
          "straightLine": true,
          "target": "direction",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "targetText": "straight line, first unit within 3",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 8 damage. The tile the target is on becomes scorched until the end of your opponent's next turn. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "firstUnitInStraightLine"
            },
            {
              "type": "scorchTile",
              "tile": "targetTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "bonechiller_greatwurm", "set": "Wrath of the Elements", "name": "Bonechiller Greatwurm", "type": "unit", "basic": false,
      "reinforce": { "mode": "tribute", "count": 2, "requirement": [["Frozen"]] }, "hp": 27, "ap": 3, "art": "art/bonechiller_greatwurm.png",
      "passives": [
        { "id": "thick_hide", "name": "Thick Hide", "trigger": "static",
          "text": "Reduces all damage taken from attacks by 1, to a minimum of 1 damage per hit.",
          "effects": [{ "type": "reduceDamage", "amount": 1, "target": "self", "from": "attack", "per": "hit", "minDamage": 1 }], "script": null }
      ],
      "abilities": [
        { "id": "devouring_maw", "name": "Devouring Maw", "cost": 1, "tags": ["melee"], "limits": { "oncePerTurn": true },
          "text": "Deals 9 damage. Use only once per turn.",
          "effects": [{ "type": "damage", "amount": 9, "hits": 1 }] },
        { "id": "tail_slam", "name": "Tail Slam", "cost": 1, "tags": ["melee"],
          "text": "Deals 7 damage.",
          "effects": [{ "type": "damage", "amount": 7, "hits": 1 }] },
        { "id": "burst_from_underneath", "name": "Burst from Underneath", "cost": 2, "tags": ["inspiring"], "isMultiStage": true, "range": [1, 3], "rangeText": "1-3",
          "target": "unit", "targetText": "push the target, then take its place",
          "text": "Apply knockback 1 to the target in the direction of your choice. If the target was moved this way, place this unit on the tile where it was, then it deals 12 damage to the target.",
          "effects": [
            { "type": "knockback", "target": "target", "distance": 1, "direction": "chosen" },
            { "type": "place", "target": "self", "tile": "targetPreviousTile", "if": "targetMoved" },
            { "type": "damage", "amount": 12, "hits": 1, "if": "targetMoved" }
          ] }
      ],
      "classTags": []
    },
    {
      "id": "lumbering_treeback", "set": "Wrath of the Elements", "name": "Lumbering Treeback", "type": "unit", "basic": false,
      "reinforce": { "mode": "tribute", "count": 2, "requirement": [["Plant"]] }, "hp": 27, "ap": 3, "art": "art/lumbering_treeback.png",
      "passives": [
        { "id": "symbiotic_fortitude", "name": "Symbiotic Fortitude", "trigger": "static",
          "text": "If this unit would lose armour from damage, first reduce the damage by 1 to a minimum of 1 damage.",
          "effects": [{ "type": "reduceDamage", "amount": 1, "target": "self", "minDamage": 1, "if": "damageWouldRemoveArmour" }], "script": null }
      ],
      "abilities": [
        { "id": "jaw_snap", "name": "Jaw Snap", "cost": 1, "tags": ["melee"], "limits": { "oncePerTurn": true },
          "text": "Deals 10 damage. Use only once per turn.",
          "effects": [{ "type": "damage", "amount": 10, "hits": 1 }] },
        { "id": "trees_bounty", "name": "Tree's Bounty", "cost": 1, "tags": ["melee", "assist"], "target": "anyUnit", "targetText": "friendly or enemy",
          "text": "If the target is an enemy, deals 6 damage. If the target is a friendly, it heals 3 damage.",
          "effects": [
            { "type": "damage", "amount": 6, "hits": 1, "if": "target.isEnemy" },
            { "type": "heal", "target": "friendlyTarget", "amount": 3 }
          ] },
        { "id": "shell_cover", "name": "Shell Cover", "cost": 1,
          "text": "Armour up to 8.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 8 }] }
      ],
      "classTags": []
    },
    {
      "id": "canyonguard_iceberg", "set": "Wrath of the Elements", "name": "Canyonguard Iceberg", "type": "unit", "basic": false,
      "reinforce": { "mode": "fusion", "count": 2, "requirement": [["Frozen"]] }, "hp": 26, "ap": 3, "art": "art/canyonguard_iceberg.png",
      "passives": [
        { "id": "immovable", "name": "Immovable", "trigger": "static",
          "text": "Immune to knockback effects.",
          "effects": [{ "type": "immune", "to": "knockback", "target": "self" }], "script": null }
      ],
      "abilities": [
        { "id": "flatten_foe", "name": "Flatten Foe", "cost": 1, "tags": ["melee"],
          "text": "This attack deals 6 more damage if this unit has not moved this turn. Deals 4 damage. Knockback 1.",
          "effects": [
            { "type": "damage", "amount": 4, "hits": 1, "modifiers": [{ "if": "self.hasNotMovedThisTurn", "addAmount": 6 }] },
            { "type": "knockback", "target": "hitUnit", "distance": 1 }
          ] },
        { "id": "freezing_crash", "name": "Freezing Crash", "cost": 1, "tags": ["melee"],
          "text": "This attack deals an additional 6 damage for each tile this unit has moved this turn. Deals 6 damage.",
          "effects": [{ "type": "damage", "amount": 6, "hits": 1, "modifiers": [{ "addAmount": { "perTileMovedThisTurn": 6 } }] }] }
      ],
      "classTags": []
    },
    {
      "id": "volcanic_tyrant",
      "set": "Wrath of the Elements",
      "name": "Volcanic Tyrant",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Flaming"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/volcanic_tyrant.png",
      "passives": [
        {
          "id": "lava_barrier_greater",
          "name": "Lava Barrier",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 3.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "spew_debris",
          "name": "Spew Debris",
          "cost": 1,
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "tile",
          "targetText": "straight line",
          "text": "Deals 6 damage to all units along the path.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        },
        {
          "id": "lava_pillar",
          "name": "Lava Pillar",
          "cost": 3,
          "tags": [],
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "tile",
          "targetText": "targets tile",
          "text": "Deals 14 damage to units on the target tile, then that tile becomes scorched until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 14,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "scorchTile",
              "tile": "target",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "elder_pine_treant", "set": "Wrath of the Elements", "name": "Elder Pine Treant", "type": "unit", "basic": false,
      "reinforce": { "mode": "fusion", "count": 2, "requirement": [["Plant"]] }, "hp": 26, "ap": 3, "art": "art/elder_pine_treant.png",
      "passives": [],
      "abilities": [
        { "id": "branch_sweep", "name": "Branch Sweep", "cost": 1, "tags": ["melee"],
          "text": "Deals 7 damage. Knockback 1.",
          "effects": [{ "type": "damage", "amount": 7, "hits": 1 }, { "type": "knockback", "target": "hitUnit", "distance": 1 }] },
        { "id": "log_roll", "name": "Log Roll", "cost": 1, "limits": { "oncePerTurn": true },
          "text": "This unit moves up to 3 tiles within the same row. It may move over units this way, and doing so deals 8 damage to each of those units. This ability must leave this unit alone on its tile. Use only once per turn.",
          "effects": [{ "type": "move", "target": "self", "distance": { "min": 1, "max": 3 }, "path": { "sameRow": true, "directionChanges": "any" },
            "mayMoveOverUnits": true, "damageToUnitsMovedOver": 8, "finalTileMustBeEmpty": true }] },
        { "id": "soothing_sap", "name": "Soothing Sap", "cost": 1, "tags": ["melee", "assist"], "target": "friendlyUnit", "targetText": "friendly target",
          "limits": { "oncePerTurn": true },
          "text": "Heal 5 damage from the target. Use only once per turn.",
          "effects": [{ "type": "heal", "target": "friendlyTarget", "amount": 5 }] }
      ],
      "classTags": []
    },
    {
      "id": "direfrost_spectre",
      "set": "Wrath of the Elements",
      "name": "Direfrost Spectre",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Frozen"
          ],
          [
            "Assassin"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/direfrost_spectre.png",
      "passives": [],
      "abilities": [
        {
          "id": "murderous_slices",
          "name": "Murderous Slices",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "text": "Use a 1AP melee attack of the promoted assassin as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true,
                "fromCard": "Assassin"
              },
              "free": true
            }
          ]
        },
        {
          "id": "whiteout_disappearance",
          "name": "Whiteout Disappearance",
          "cost": 1,
          "tags": [
            "inspiring"
          ],
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Move this unit to the target tile. Use only once per turn.",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target"
            }
          ]
        },
        {
          "id": "bloodchilling_dagger",
          "name": "Bloodchilling Dagger",
          "cost": 1,
          "tags": [
            "melee"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 6 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit (they must choose a different non-token unit if able). Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "if": "target.tookLastTurn",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "firebrand_raider",
      "set": "Wrath of the Elements",
      "name": "Firebrand Raider",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Flaming"
          ],
          [
            "Plunderer"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/firebrand_raider.png",
      "passives": [
        {
          "id": "rigged_to_blow",
          "name": "Rigged to Blow",
          "trigger": "self.destroysEnemyUnitOrObstructingWall",
          "text": "When this unit kills an enemy unit or an Obstructing Wall, deal 5 damage to all units surrounding the tile that unit was on.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "unitsSurroundingDestroyedTile"
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "flaming_cutlass",
          "name": "Flaming Cutlass",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted units as this ability for free, except the tile the target is on becomes scorched until the end of your opponent's next turn (a unit moving onto or off of a scorched tile takes 4 damage).",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            },
            {
              "type": "scorchTile",
              "tile": "targetTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        },
        {
          "id": "napalm_spray",
          "name": "Napalm Spray",
          "cost": 1,
          "tags": [
            "inspiring"
          ],
          "usesPath": true,
          "pathRule": "any",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "tile",
          "targetText": "path to the target tile",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Deals 7 damage to all units along the path. Use only once per turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "spore_mystic",
      "set": "Wrath of the Elements",
      "name": "Spore Mystic",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Plant"
          ],
          [
            "Sage"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/spore_mystic.png",
      "passives": [],
      "abilities": [
        {
          "id": "mushroom_sprouting",
          "name": "Mushroom Sprouting",
          "cost": 1,
          "tags": [],
          "range": [
            1,
            4
          ],
          "rangeText": "1-4",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "text": "Place a Toadstool token on the target tile (It is a token with 8HP, 0AP, and no abilities). Use this ability only if you have 2 or fewer Toadstools already in play.",
          "effects": [
            {
              "type": "createToken",
              "token": "toadstool",
              "tile": "target",
              "if": "friendlyTokensAtMost:toadstool:2"
            }
          ]
        },
        {
          "id": "spray_of_spores",
          "name": "Spray of Spores",
          "cost": 1,
          "target": "anyUnit",
          "range": [
            1,
            20
          ],
          "rangeText": "any",
          "targetText": "a unit surrounding a Toadstool",
          "requires": "target.surroundingFriendlyToken:toadstool",
          "text": "Deals 5 damage to a unit surrounding a Toadstool.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        },
        {
          "id": "fungal_surprise",
          "name": "Fungal Surprise",
          "cost": 1,
          "tags": [
            "assist"
          ],
          "limits": {
            "oncePerTurn": true
          },
          "text": "Each enemy unit surrounding a Toadstool must spend an additional 1AP on its first action next turn if it takes the turn. Use only once per turn.",
          "effects": [
            {
              "type": "increaseActionCost",
              "target": "enemyUnitsSurroundingFriendlyToken:toadstool",
              "amount": 1,
              "scope": "firstActionOfTurn",
              "duration": "nextTurnIfTargetTakesIt"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "nimbus_mage",
      "set": "Fury of the Skies",
      "name": "Nimbus Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 14,
      "ap": 2,
      "art": "art/nimbus_mage.png",
      "passives": [
        {
          "id": "cloud_cover",
          "name": "Cloud Cover",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "gust_of_wind",
          "name": "Gust of Wind",
          "cost": 1,
          "text": "Apply knockback 1. Use only once per turn.",
          "straightLine": true,
          "target": "direction",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "targetText": "straight line, first unit within 2",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "knockback",
              "target": "firstUnitInStraightLine",
              "distance": 1
            }
          ]
        },
        {
          "id": "air_razor",
          "name": "Air Razor",
          "cost": 1,
          "text": "Deals 5 damage, bypassing up to 2 armour.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "bypassArmourUpTo",
              "amount": 2
            }
          ]
        }
      ],
      "classTags": [
        "Nimbus",
        "Mage"
      ]
    },
    {
      "id": "nimbus_assassin",
      "set": "Fury of the Skies",
      "name": "Nimbus Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/nimbus_assassin.png",
      "passives": [
        {
          "id": "unseen_wind",
          "name": "Unseen Wind",
          "trigger": "static",
          "text": "This unit's melee attacks made from the tile behind the target deal an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownMeleeAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "selfOnTileBehindTarget"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "zephyr_step",
          "name": "Zephyr Step",
          "cost": 1,
          "text": "Choose a path of up to 3 empty tiles. Move this unit along the path. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "path": {
                "emptyTilesOnly": true
              }
            }
          ]
        },
        {
          "id": "vapor_blade",
          "name": "Vapor Blade",
          "cost": 1,
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "suffocating_draft",
          "name": "Suffocating Draft",
          "cost": 1,
          "text": "Deals 3 damage. Until the end of your opponent's next turn, the target cannot use abilities that cost 2 or more AP. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1
            },
            {
              "type": "cannotUseAbilities",
              "target": "hitUnit",
              "minCost": 2,
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "tags": [
            "melee",
            "inspiring"
          ]
        }
      ],
      "classTags": [
        "Nimbus",
        "Assassin"
      ]
    },
    {
      "id": "nimbus_drakeling",
      "set": "Fury of the Skies",
      "name": "Nimbus Drakeling",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/nimbus_drakeling.png",
      "passives": [
        {
          "id": "gale_wings",
          "name": "Gale Wings",
          "trigger": "static",
          "text": "Takes 2 damage less per attack from ranged attacks, to a minimum of 1 damage per attack.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 2,
              "target": "self",
              "from": "rangedAttack",
              "per": "attack",
              "minDamage": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "biting_draft",
          "name": "Biting Draft",
          "cost": 1,
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "tailwind_swoop",
          "name": "Tailwind Swoop",
          "cost": 2,
          "text": "This unit moves 2 tiles in a straight line. If it ends this movement surrounding an enemy unit, deal 5 damage to that unit and apply knockback 1.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "straightLine": true
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "target": "chosenEnemyInMeleeRange",
              "if": "endsSurroundingEnemy"
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": [
        "Nimbus",
        "Drakeling"
      ]
    },
    {
      "id": "frozen_nimbus",
      "set": "Fury of the Skies",
      "name": "Frozen Nimbus",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/frozen_nimbus.png",
      "passives": [
        {
          "id": "heavy_air",
          "name": "Heavy Air",
          "trigger": "self.appliesKnockbackToEnemy",
          "text": "When this unit applies knockback to an enemy unit, if that unit takes the next turn, it must spend an additional 1AP to take its first action.",
          "effects": [
            {
              "type": "increaseActionCost",
              "target": "knockedBackUnit",
              "amount": 1,
              "scope": "firstActionOfTurn",
              "duration": "nextTurnIfTargetTakesIt"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "battering_gale",
          "name": "Battering Gale",
          "cost": 1,
          "text": "Deals 4 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "freezing_squall",
          "name": "Freezing Squall",
          "cost": 2,
          "text": "Deals 10 damage.",
          "straightLine": true,
          "target": "direction",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "targetText": "straight line, first unit within 3",
          "effects": [
            {
              "type": "damage",
              "amount": 10,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Frozen",
        "Nimbus"
      ]
    },
    {
      "id": "flaming_nimbus",
      "set": "Fury of the Skies",
      "name": "Flaming Nimbus",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/flaming_nimbus.png",
      "passives": [
        {
          "id": "fanning_the_flames",
          "name": "Fanning the Flames",
          "trigger": "self.appliesKnockbackToEnemy",
          "text": "Whenever this unit applies knockback to an enemy, deal 4 damage to that unit. Then, the tile it lands on becomes scorched until the end of your opponent's next turn (a unit moving onto or off of a scorched tile takes 4 damage).",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "target": "knockedBackUnit"
            },
            {
              "type": "scorchTile",
              "tile": "knockedBackUnitLandingTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "thermal_push",
          "name": "Thermal Push",
          "cost": 1,
          "text": "Deals 4 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "searing_whip",
          "name": "Searing Whip",
          "cost": 1,
          "text": "Deals 5 damage.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Flaming",
        "Nimbus"
      ]
    },
    {
      "id": "lightning_nimbus",
      "set": "Fury of the Skies",
      "name": "Lightning Nimbus",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/lightning_nimbus.png",
      "passives": [
        {
          "id": "static_discharge",
          "name": "Static Discharge",
          "trigger": "self.movesExactlyOneTile",
          "text": "Whenever this unit moves exactly 1 tile, it deals 2 damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "crackling_strike",
          "name": "Crackling Strike",
          "cost": 1,
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "storm_surge",
          "name": "Storm Surge",
          "cost": 1,
          "text": "This unit moves 1 tile for free. Then, you may deal 2 damage and apply knockback 1 to a surrounding enemy unit. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target",
              "free": true
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "target": "chosenEnemyInMeleeRange",
              "optional": true
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "emptyTile",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "targetText": "move 1 tile, then a surrounding enemy"
        }
      ],
      "classTags": [
        "Lightning",
        "Nimbus"
      ]
    },
    {
      "id": "lightning_fighter",
      "set": "Fury of the Skies",
      "name": "Lightning Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/lightning_fighter.png",
      "passives": [
        {
          "id": "conductive_strikes",
          "name": "Conductive Strikes",
          "trigger": "self.hitsEnemyWithMeleeAttack",
          "text": "Whenever this unit hits an enemy unit with a melee attack, it deals 1 damage to all other enemy units surrounding the target.",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 1,
              "area": "otherEnemyUnitsSurroundingTarget"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "arcing_jab",
          "name": "Arcing Jab",
          "cost": 1,
          "text": "Deals 3 damage. Then, hits again for 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": {
                "amount": 2
              }
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "staggering_blow",
          "name": "Staggering Blow",
          "cost": 2,
          "text": "Deals 8 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit (they must choose a different non-token unit if able).",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            },
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "if": "target.tookLastTurn",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Lightning",
        "Fighter"
      ]
    },
    {
      "id": "lightning_plant",
      "set": "Fury of the Skies",
      "name": "Lightning Plant",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/lightning_plant.png",
      "passives": [
        {
          "id": "energized_roots",
          "name": "Energized Roots",
          "trigger": "static",
          "text": "During this unit's turn, if it has not moved, its attacks deal an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "self.hasNotMovedThisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "shocking_lashes",
          "name": "Shocking Lashes",
          "cost": 1,
          "text": "Deals 3 damage to up to 2 different surrounding targets.",
          "isMultiStage": true,
          "target": "enemyUnit",
          "targetCount": {
            "max": 2,
            "distinct": true
          },
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "energized_beam",
          "name": "Energized Beam",
          "cost": 1,
          "text": "Deals 3 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit (they must choose a different non-token unit if able).",
          "straightLine": true,
          "target": "direction",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "targetText": "straight line, first unit within 3",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "firstUnitInStraightLine"
            },
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "if": "target.tookLastTurn",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ]
        }
      ],
      "classTags": [
        "Lightning",
        "Plant"
      ]
    },
    {
      "id": "lightning_assassin",
      "set": "Fury of the Skies",
      "name": "Lightning Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/lightning_assassin.png",
      "passives": [
        {
          "id": "arcing_ambush",
          "name": "Arcing Ambush",
          "trigger": "static",
          "text": "When this unit makes a melee attack from the tile behind the target, it deals an additional 3 damage on the first hit, and 2 damage to all other enemy units surrounding the target.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownMeleeAttacks",
              "amount": 3,
              "scope": "firstHit",
              "if": "selfOnTileBehindTarget"
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "otherEnemyUnitsSurroundingTarget",
              "if": "selfOnTileBehindTarget",
              "melee": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "charged_knives",
          "name": "Charged Knives",
          "cost": 1,
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "blink_dash",
          "name": "Blink Dash",
          "cost": 1,
          "text": "Place this unit on the target tile (ignoring units in the way).",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true
            }
          ]
        }
      ],
      "classTags": [
        "Lightning",
        "Assassin"
      ]
    },
    {
      "id": "lightning_wildcat",
      "set": "Fury of the Skies",
      "name": "Lightning Wildcat",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/lightning_wildcat.png",
      "passives": [
        {
          "id": "static_fur",
          "name": "Static Fur",
          "trigger": "enemyMovesOntoTileSurroundingSelf",
          "text": "Enemy units that move onto a tile surrounding this unit take 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "target": "movingUnit"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "jolting_bite",
          "name": "Jolting Bite",
          "cost": 1,
          "text": "Deals 4 damage. If this attack deals damage, the target cannot use react effects until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "cannotUseReacts",
              "target": "hitUnit",
              "if": "damageDealt",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "pouncing_arc",
          "name": "Pouncing Arc",
          "cost": 2,
          "text": "Move 1 tile. Then, deal 7 damage to a surrounding enemy unit and 3 damage to all other enemy units surrounding this unit.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "target": "chosenEnemyInMeleeRange"
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "otherEnemyUnitsSurroundingSelf"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "emptyTile",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "targetText": "move 1 tile, then a surrounding enemy"
        }
      ],
      "classTags": [
        "Lightning",
        "Wildcat"
      ]
    },
    {
      "id": "lightning_ooze",
      "set": "Fury of the Skies",
      "name": "Lightning Ooze",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/lightning_ooze.png",
      "passives": [
        {
          "id": "conductive_sludge",
          "name": "Conductive Sludge",
          "trigger": "self.takesDamageFromAttack",
          "text": "Whenever this unit takes damage from an attack, it deals 2 damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "jolt_splash",
          "name": "Jolt Splash",
          "cost": 1,
          "text": "Deals 2 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "electrify_puddle",
          "name": "Electrify Puddle",
          "cost": 1,
          "text": "Deals 3 damage to all units on the target tile and all units on surrounding tiles (including this one). Use only once per turn.",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "target": "tile",
          "targetText": "targets tile",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "targetTileAndSurrounding"
            }
          ],
          "tags": [
            "assist"
          ]
        }
      ],
      "classTags": [
        "Lightning",
        "Ooze"
      ]
    },
    {
      "id": "lunar_assassin",
      "set": "Fury of the Skies",
      "name": "Lunar Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/lunar_assassin.png",
      "passives": [
        {
          "id": "eclipse_strike",
          "name": "Eclipse Strike",
          "trigger": "static",
          "text": "This unit's melee attacks made from the tile behind the target deal an additional 2 damage on the first hit. If the attack is the second ability used this turn, it also bypasses up to 3 armour.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownMeleeAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "selfOnTileBehindTarget"
            },
            {
              "type": "bypassArmourUpTo",
              "amount": 3,
              "if": "selfOnTileBehindTarget&&abilityNumberThisTurn:2",
              "melee": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "shadow_phase",
          "name": "Shadow Phase",
          "cost": 1,
          "text": "Place this unit on the target tile (ignoring units in the way).",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true
            }
          ]
        },
        {
          "id": "crescent_slash",
          "name": "Crescent Slash",
          "cost": 1,
          "text": "Deals 5 damage. If this is the first ability used this turn, you may move 1 tile for free after the attack resolves.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true,
              "timing": "afterAttack",
              "if": "abilityNumberThisTurn:1"
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Lunar",
        "Assassin"
      ]
    },
    {
      "id": "lunar_lancer",
      "set": "Fury of the Skies",
      "name": "Lunar Lancer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/lunar_lancer.png",
      "passives": [
        {
          "id": "waxing_momentum",
          "name": "Waxing Momentum",
          "trigger": "self.endOfOwnTurn",
          "text": "At the end of this unit's turn, if it used two abilities this turn, it armours up to 2 (moving and drawing are actions, not abilities).",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2,
              "if": "self.abilitiesUsedThisTurn>=2"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "full_moon_thrust",
          "name": "Full Moon Thrust",
          "cost": 1,
          "text": "Deals 5 damage. If this is the first ability this unit used this turn, you may move this unit 1 tile for free before declaring the target.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true,
              "timing": "beforeDeclaringAttack",
              "if": "abilityNumberThisTurn:1"
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "silver_charge",
          "name": "Silver Charge",
          "cost": 1,
          "text": "Move up to 2 tiles in a chosen direction. Then, if there is an enemy in that direction, deals 6 damage to it. Use only once each turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 2
              },
              "straightLine": true
            },
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "target": "enemyInDirectionMoved"
            }
          ]
        }
      ],
      "classTags": [
        "Lunar",
        "Lancer"
      ]
    },
    {
      "id": "lunar_wildcat",
      "set": "Fury of the Skies",
      "name": "Lunar Wildcat",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/lunar_wildcat.png",
      "passives": [
        {
          "id": "waning_shadow",
          "name": "Waning Shadow",
          "trigger": "static",
          "text": "The second attack this unit uses each turn deals an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "attackNumberThisTurn:2"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "lunar_leap",
          "name": "Lunar Leap",
          "cost": 1,
          "text": "Move exactly 2 tiles in the same direction. Deal 5 damage to one enemy unit surrounding the tile you land on. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "straightLine": true,
              "finalTileMustBeEmpty": true
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "target": "chosenEnemyInMeleeRange"
            }
          ],
          "targetText": "exactly 2 tiles in a straight line, then a surrounding enemy"
        },
        {
          "id": "midnight_bite",
          "name": "Midnight Bite",
          "cost": 1,
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Lunar",
        "Wildcat"
      ]
    },
    {
      "id": "solar_knight",
      "set": "Fury of the Skies",
      "name": "Solar Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/solar_knight.png",
      "passives": [
        {
          "id": "first_light",
          "name": "First Light",
          "trigger": "static",
          "text": "If the first ability this unit uses in a turn is an attack, it deals an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "abilityNumberThisTurn:1"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "sunblade",
          "name": "Sunblade",
          "cost": 1,
          "text": "Deals 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "blinding_shield",
          "name": "Blinding Shield",
          "cost": 1,
          "text": "Armour up to 3. Enemy units surrounding this unit cannot use ranged attacks until the end of your opponent's next turn. Use only once per turn.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            },
            {
              "type": "cannotUseRangedAttacks",
              "target": "enemyUnitsSurroundingSelf",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "self",
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "classTags": [
        "Solar",
        "Knight"
      ]
    },
    {
      "id": "solar_drakeling",
      "set": "Fury of the Skies",
      "name": "Solar Drakeling",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/solar_drakeling.png",
      "passives": [
        {
          "id": "shining_scales",
          "name": "Shining Scales",
          "trigger": "static",
          "text": "This unit take 1 damage less from melee attacks. When damage is prevented this way, deal that much damage to the attacker.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "meleeAttack",
              "per": "attack",
              "dealPreventedToAttacker": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "scale_shot",
          "name": "Scale Shot",
          "cost": 1,
          "text": "Deals 6 damage.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        },
        {
          "id": "bright_swoop",
          "name": "Bright Swoop",
          "cost": 2,
          "text": "Move up to 3 tiles, ignoring units in the way. Then, deal 4 damage to all surrounding enemy units. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "emptyTile",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "targetText": "empty tile target (ignores units in the way)"
        }
      ],
      "classTags": [
        "Solar",
        "Drakeling"
      ]
    },
    {
      "id": "solar_lancer",
      "set": "Fury of the Skies",
      "name": "Solar Lancer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/solar_lancer.png",
      "passives": [
        {
          "id": "daybreak_charge",
          "name": "Daybreak Charge",
          "trigger": "self.firstActionIsMove",
          "text": "If this unit moves as its first action during its turn, it may move an additional tile in the same direction for free.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "extraTiles": 1,
              "direction": "same",
              "optional": true,
              "free": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "radiant_thrust",
          "name": "Radiant Thrust",
          "cost": 1,
          "text": "Deals 4 damage. If this is the first ability used this turn, apply knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1,
              "if": "abilityNumberThisTurn:1"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "solar_joust",
          "name": "Solar Joust",
          "cost": 1,
          "text": "Move up to 2 tiles in a chosen direction. Then, if there is an enemy in that direction, deals 5 damage to it.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 2
              },
              "straightLine": true
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "target": "enemyInDirectionMoved"
            }
          ]
        }
      ],
      "classTags": [
        "Solar",
        "Lancer"
      ]
    },
    {
      "id": "toxic_ooze",
      "set": "Fury of the Skies",
      "name": "Toxic Ooze",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/toxic_ooze.png",
      "passives": [
        {
          "id": "corrosive_sludge",
          "name": "Corrosive Sludge",
          "trigger": "self.takesDamageFromMeleeAttack",
          "text": "Whenever this unit takes damage from a melee attack, remove up to that much armour from the attacking unit.",
          "effects": [
            {
              "type": "removeArmour",
              "target": "attacker",
              "amount": "damageTaken"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "acid_splash",
          "name": "Acid Splash",
          "cost": 1,
          "text": "Deals 2 damage. Hits three times. The first hit bypasses armour.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3,
              "firstHitBypassesArmour": true
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "gelatinous_bounce",
          "name": "Gelatinous Bounce",
          "cost": 2,
          "text": "Move 1 tile, deal 3 damage to all surrounding enemies, then armour up to 3.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ],
          "target": "emptyTile",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "targetText": "move 1 tile"
        }
      ],
      "classTags": [
        "Ooze"
      ]
    },
    {
      "id": "storm_rogue",
      "set": "Fury of the Skies",
      "name": "Storm Rogue",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Assassin"
          ]
        ]
      },
      "hp": 22,
      "ap": 3,
      "art": "art/storm_rogue.png",
      "passives": [
        {
          "id": "vacuum_strike",
          "name": "Vacuum Strike",
          "trigger": "static",
          "text": "When this unit makes a melee attack from the tile behind the target, the target cannot use React effects, and its Armour is treated as 0 for that attack.",
          "effects": [
            {
              "type": "ignoreTargetArmour",
              "if": "selfOnTileBehindTarget",
              "melee": true
            },
            {
              "type": "cannotUseReacts",
              "target": "target",
              "if": "selfOnTileBehindTarget"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "thunderstep",
          "name": "Thunderstep",
          "cost": 1,
          "text": "Place this unit on the target tile (ignoring units in the way). If you place this unit directly behind an enemy, deal 2 damage to that enemy.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "target": "enemyThisUnitIsBehind",
              "if": "placedDirectlyBehindEnemy"
            }
          ]
        },
        {
          "id": "decapitate",
          "name": "Decapitate",
          "cost": 1,
          "text": "Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "overcharged_rootnexus",
      "set": "Fury of the Skies",
      "name": "Overcharged Rootnexus",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Plant"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/overcharged_rootnexus.png",
      "passives": [
        {
          "id": "root_conduction",
          "name": "Root Conduction",
          "trigger": "static",
          "text": "During this unit's turn, if it has not moved, the range of its abilities is increased by 1, and its attacks deal an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "self",
              "appliesTo": "abilities",
              "amount": 1,
              "if": "self.hasNotMovedThisTurn"
            },
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "self.hasNotMovedThisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "energetic_lash",
          "name": "Energetic Lash",
          "cost": 1,
          "text": "Deals 3 damage to up to 2 different targets. Use up to 2 times per turn.",
          "isMultiStage": true,
          "target": "enemyUnit",
          "targetCount": {
            "max": 2,
            "distinct": true
          },
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "limits": {
            "maxPerTurn": 2
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1
            }
          ]
        },
        {
          "id": "barbed_tether",
          "name": "Barbed Tether",
          "cost": 1,
          "text": "Deals 4 damage. Pull the target 1 tile toward this unit. Use only once per turn.",
          "straightLine": true,
          "target": "direction",
          "range": [
            2,
            3
          ],
          "rangeText": "2-3",
          "targetText": "straight line, first unit within 3",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "firstUnitInStraightLine"
            },
            {
              "type": "pull",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "fulgur_scale_skywyrm",
      "set": "Fury of the Skies",
      "name": "Fulgur-Scale Skywyrm",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Drakeling"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/fulgur_scale_skywyrm.png",
      "passives": [
        {
          "id": "energy_crackle",
          "name": "Energy Crackle",
          "trigger": "static",
          "text": "This unit takes 2 less damage from ranged attacks to a minimum of 1 damage. Whenever an enemy unit attacks this unit from range 2 or further, deal 2 damage to that attacker.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 2,
              "target": "self",
              "from": "rangedAttack",
              "per": "hit",
              "minDamage": 1
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "target": "attacker",
              "if": "attackerAtRange2OrMore"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "spark_talons",
          "name": "Spark Talons",
          "cost": 1,
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "arcing_breath",
          "name": "Arcing Breath",
          "cost": 1,
          "text": "Deals 4 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit.",
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "if": "target.tookLastTurn",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ]
        },
        {
          "id": "crashing_thunder_dive",
          "name": "Crashing Thunder Dive",
          "cost": 3,
          "text": "Move up to 4 tiles, moving over units in the way. Then, deal 6 damage to all surrounding enemy units and apply knockback 1 to each. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true,
              "finalTileMustBeEmpty": true
            },
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            },
            {
              "type": "knockback",
              "target": "areaHitUnits",
              "distance": 1
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "emptyTile",
          "range": [
            1,
            4
          ],
          "rangeText": "1-4",
          "targetText": "empty tile target (ignores units in the way)"
        }
      ],
      "classTags": []
    },
    {
      "id": "firebrand_wingserpent",
      "set": "Fury of the Skies",
      "name": "Firebrand Wingserpent",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Drakeling"
          ]
        ]
      },
      "hp": 22,
      "ap": 3,
      "art": "art/firebrand_wingserpent.png",
      "passives": [
        {
          "id": "scaled_boon",
          "name": "Scaled Boon",
          "trigger": "static",
          "text": "This unit takes 4 damage less from attacks of units on scorched tiles.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 4,
              "target": "self",
              "from": "attack",
              "per": "attack",
              "if": "attacker.onScorchedTile"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "burning_bite",
          "name": "Burning Bite",
          "cost": 1,
          "text": "Deals 7 damage. Scorch the tile the target is on until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "scorchTile",
              "tile": "targetTile",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "sky_slither",
          "name": "Sky Slither",
          "cost": 2,
          "text": "Move up to 3 tiles, never going in the same direction twice in a row. This unit may move over other units this way, and doing so deals 4 damage to each of those units and scorches any tiles they are on until the end of your opponent's next turn. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "path": {
                "noSameDirectionTwiceInARow": true
              },
              "mayMoveOverUnits": true,
              "finalTileMustBeEmpty": true,
              "damageToUnitsMovedOver": 4,
              "scorchTilesOfUnitsMovedOver": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "zenith_charger",
      "set": "Fury of the Skies",
      "name": "Zenith Charger",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Lancer"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/zenith_charger.png",
      "passives": [
        {
          "id": "unstoppable_momentum",
          "name": "Unstoppable Momentum",
          "trigger": "static",
          "text": "Whenever this unit attacks, it deals an additional 1 damage for every tile it moved this turn to a maximum of 3.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": {
                "perTileMovedThisTurn": 1,
                "max": 3
              },
              "scope": "firstHit"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "piercing_charge",
          "name": "Piercing Charge",
          "cost": 1,
          "text": "Move up to 3 tiles in a chosen direction. Then, if there is an enemy in that direction, deal 6 damage to it and bypass up to 2 armour. Use up to twice per turn.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "straightLine": true
            },
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "target": "enemyInDirectionMoved"
            },
            {
              "type": "bypassArmourUpTo",
              "amount": 2
            }
          ],
          "limits": {
            "maxPerTurn": 2
          }
        },
        {
          "id": "brace_for_impact",
          "name": "Brace for Impact",
          "cost": 1,
          "text": "Armour up to 3. This unit cannot be knocked back until the start of your next turn.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            },
            {
              "type": "immune",
              "to": "knockback",
              "target": "self",
              "duration": "untilStartOfYourNextTurn"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "self"
        }
      ],
      "classTags": []
    },
    {
      "id": "boastful_champion",
      "set": "Fury of the Skies",
      "name": "Boastful Champion",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Lancer"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/boastful_champion.png",
      "passives": [
        {
          "id": "medal_collection",
          "name": "Medal Collection",
          "trigger": "self.killsEnemyUnit",
          "text": "Whenever this unit kills an enemy unit, it gains 1 armour.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "amount": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "champions_lance",
          "name": "Champion's Lance",
          "cost": 1,
          "text": "Use a 1AP melee attack of the promoted unit as this ability for free, except it applies knockback 1 to the target.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ]
        },
        {
          "id": "skillful_joust",
          "name": "Skillful Joust",
          "cost": 3,
          "text": "Armour up to 2, then move up to 3 tiles in a chosen direction. For each tile moved this way, deals 5 damage to the enemy in the direction moved (if there is one).",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            },
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "straightLine": true
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": {
                "perTileMoved": 1
              },
              "target": "enemyInDirectionMoved"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "eclipse_prowler",
      "set": "Fury of the Skies",
      "name": "Eclipse Prowler",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Wildcat"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/eclipse_prowler.png",
      "passives": [
        {
          "id": "predators_rhythm",
          "name": "Predator's Rhythm",
          "trigger": "self.dealsDamageFirstTimeEachTurn",
          "text": "The first time this unit deals damage each turn, you may immediately move it exactly 1 tile for free.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "rift_leap",
          "name": "Rift Leap",
          "cost": 1,
          "text": "Move exactly 2 tiles in the same direction, ignoring units in the way. Deal 5 damage to one enemy unit surrounding the tile you land on.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "straightLine": true,
              "ignoreUnitsInWay": true,
              "finalTileMustBeEmpty": true
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "target": "chosenEnemyInMeleeRange"
            }
          ],
          "targetText": "exactly 2 tiles in a straight line (over units), then a surrounding enemy"
        },
        {
          "id": "eviscerate",
          "name": "Eviscerate",
          "cost": 1,
          "text": "Deals 5 damage. Hits twice. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "jungle_stalker",
      "set": "Fury of the Skies",
      "name": "Jungle Stalker",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Wildcat"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/jungle_stalker.png",
      "passives": [
        {
          "id": "lie_in_ambush",
          "name": "Lie in Ambush",
          "trigger": "static",
          "text": "If this unit has not moved this turn, its attacks deal an additional 1 damage per hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 1,
              "scope": "allHits",
              "if": "self.hasNotMovedThisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "lethal_fangs",
          "name": "Lethal Fangs",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice. If this attack kills the target, this unit may move 1 tile for free. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true,
              "timing": "afterAttack",
              "if": "targetKilled"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "razor_claws",
          "name": "Razor Claws",
          "cost": 1,
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "canopy_cover",
          "name": "Canopy Cover",
          "cost": 2,
          "text": "This unit cannot be the target of abilities until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "cannotBeTargeted",
              "target": "self",
              "duration": "opponentNextTurn"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "caustic_terror_slime",
      "set": "Fury of the Skies",
      "name": "Caustic Terror-Slime",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Ooze"
          ]
        ]
      },
      "hp": 28,
      "ap": 3,
      "art": "art/caustic_terror_slime.png",
      "passives": [
        {
          "id": "reactive_splatter",
          "name": "Reactive Splatter",
          "trigger": "self.takesDamage",
          "text": "Whenever this unit takes damage, it deals 1 damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "melting_ooze",
          "name": "Melting Ooze",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice. The first hit bypasses all armour. Use no more than 2 times per turn.",
          "limits": {
            "maxPerTurn": 2
          },
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2,
              "firstHitBypassesArmour": true
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "sludge_wave",
          "name": "Sludge Wave",
          "cost": 2,
          "text": "Move 1 tile. Apply knockback 1 to all surrounding enemy units, then deal 3 damage to them.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "knockback",
              "target": "enemyUnitsSurroundingSelf",
              "distance": 1
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "knockedBackUnits"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "emptyTile",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "targetText": "move 1 tile"
        }
      ],
      "classTags": []
    },
    {
      "id": "great_gel_prism",
      "set": "Fury of the Skies",
      "name": "Great Gel Prism",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Ooze"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/great_gel_prism.png",
      "passives": [
        {
          "id": "engulf",
          "name": "Engulf",
          "trigger": "self.damagesEnemyBasicUnitWithMeleeAttack",
          "text": "When this unit deals damage to an enemy basic unit with a melee attack, if there is no enemy unit under it, place that unit under it. That unit is no longer in play, and it now also counts as the promoted unit for this unit's attacks. When this unit dies, the enemy unit under it takes its place (The unit is under its owner's control and starts at full HP).",
          "effects": [
            {
              "type": "engulf",
              "target": "damagedUnit",
              "if": "noUnitEngulfed",
              "countsAsPromotedUnit": true
            },
            {
              "type": "releaseEngulfed",
              "trigger": "self.dies",
              "control": "owner",
              "hp": "full"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "flattening_roll",
          "name": "Flattening Roll",
          "cost": 1,
          "text": "Deals 4 damage. Knockback 1. Then, move this unit onto the tile the target was on if it is no longer there.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            },
            {
              "type": "move",
              "target": "self",
              "tile": "targetFormerTile",
              "if": "targetMoved"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "gel_synapse",
          "name": "Gel Synapse",
          "cost": 2,
          "text": "Use an ability of the promoted unit as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {},
              "free": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "feverish_manifestation",
      "set": "Fury of the Skies",
      "name": "Feverish Manifestation",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Flaming"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/feverish_manifestation.png",
      "passives": [
        {
          "id": "invigorating_flame",
          "name": "Invigorating Flame",
          "trigger": "static",
          "text": "If this unit is standing on a scorched tile, it gains +1 to the range of its abilities.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "self",
              "appliesTo": "abilities",
              "amount": 1,
              "if": "self.onScorchedTile"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "set_ablaze",
          "name": "Set Ablaze",
          "cost": 1,
          "text": "Create a Raging Bonfire token on the target tile (It is a token with 12HP, 0AP, and Passive- Blazing Fixture). Use only once per turn.",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "target": "emptyTile",
          "targetText": "tile target",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "createToken",
              "token": "raging_bonfire",
              "tile": "target"
            }
          ]
        },
        {
          "id": "flame_lick",
          "name": "Flame Lick",
          "cost": 1,
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "superheat",
          "name": "Superheat",
          "cost": 2,
          "text": "All enemies on a scorched tile take 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "enemyUnitsOnScorchedTiles"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "glacial_monolith",
      "set": "Fury of the Skies",
      "name": "Glacial Monolith",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Frozen"
          ]
        ]
      },
      "hp": 28,
      "ap": 3,
      "art": "art/glacial_monolith.png",
      "passives": [
        {
          "id": "deep_freeze",
          "name": "Deep Freeze",
          "trigger": "multiple",
          "text": "As soon as a scorched tile is surrounding this unit, it is no longer scorched. This effect overrides other effects. Units starting their turn next to this one take 2 damage.",
          "effects": [
            {
              "type": "unscorchTiles",
              "tiles": "surroundingSelf"
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "target": "unitsStartingTurnSurroundingSelf",
              "trigger": "unitTurnStart"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "freeze_ray",
          "name": "Freeze Ray",
          "cost": 1,
          "text": "Deals 6 damage to all units on the path.",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        },
        {
          "id": "biting_gale",
          "name": "Biting Gale",
          "cost": 2,
          "text": "Deals 6 damage. If the target takes the next turn, it starts the turn with 1 less AP.",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "increaseActionCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstActionOfTurn",
              "duration": "nextTurnIfTargetTakesIt"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "moons_acolyte",
      "set": "Fury of the Skies",
      "name": "Moon's Acolyte",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Lunar"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/moons_acolyte.png",
      "passives": [
        {
          "id": "midnight_calm",
          "name": "Midnight Calm",
          "trigger": "self.usesThirdAbilityOfTurn",
          "text": "When this unit uses its third ability in a turn, it armours up to 3.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "wicked_blow",
          "name": "Wicked Blow",
          "cost": 1,
          "text": "Use a 1AP melee attack of the promoted unit as this ability for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            }
          ]
        },
        {
          "id": "creatures_of_night",
          "name": "Creatures of Night",
          "cost": 1,
          "text": "Create a Freak token on the target tile (It is a token with 12HP, 2AP, Passive- Mindless, and Explode). Use only if you have 2 or fewer Freak tokens in play.",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "target": "emptyTile",
          "targetText": "tile target",
          "effects": [
            {
              "type": "createToken",
              "token": "freak",
              "tile": "target",
              "if": "friendlyTokensAtMost:freak:2"
            }
          ]
        },
        {
          "id": "vile_ceremony",
          "name": "Vile Ceremony",
          "cost": 3,
          "text": "All Freak tokens you control use Explode for free. Use only if this unit has at least 10 damage on it.",
          "requires": "self.damageAtLeast:10",
          "target": "self",
          "effects": [
            {
              "type": "tokensUseAbility",
              "source": "friendlyTokens:freak",
              "ability": "explode",
              "free": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "full_moon_strider",
      "set": "Fury of the Skies",
      "name": "Full-Moon Strider",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Lunar"
          ]
        ]
      },
      "hp": 29,
      "ap": 3,
      "art": "art/full_moon_strider.png",
      "passives": [
        {
          "id": "eerie_presence",
          "name": "Eerie Presence",
          "trigger": "self.attacksBeforeMovingThisTurn",
          "text": "When this unit attacks before moving in a turn, it armours up to 2.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "tripod_stomps",
          "name": "Tripod Stomps",
          "cost": 1,
          "text": "Deals 3 damage. Hits 3 times. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "leg_swing",
          "name": "Leg Swing",
          "cost": 1,
          "text": "Use a 1AP melee attack of the promoted unit as this attack for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            }
          ]
        },
        {
          "id": "maddening_fog",
          "name": "Maddening Fog",
          "cost": 1,
          "text": "Attacks of your opponent's units deal 1 damage less next turn.",
          "effects": [
            {
              "type": "reduceDamageDealt",
              "target": "enemyUnits",
              "amount": 1,
              "appliesTo": "itsAttacks",
              "duration": "opponentNextTurn"
            }
          ],
          "tags": [
            "inspiring"
          ],
          "target": "self"
        },
        {
          "id": "super_jump",
          "name": "Super Jump",
          "cost": 3,
          "text": "Place this unit on the target tile. Then, deals damage equal to twice the number of tiles travelled to all surrounding units.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "damage",
              "amount": {
                "perTileTravelled": 2
              },
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "brightwing_phoenix",
      "set": "Fury of the Skies",
      "name": "Brightwing Phoenix",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Solar"
          ]
        ]
      },
      "hp": 20,
      "ap": 3,
      "art": "art/brightwing_phoenix.png",
      "passives": [
        {
          "id": "firebirds_death_knell",
          "name": "Firebird's Death Knell",
          "trigger": "self.dies",
          "text": "When this unit dies, it deals 8 damage to all units that were surrounding it.",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            }
          ]
        },
        {
          "id": "solar_wings",
          "name": "Solar Wings",
          "trigger": "static",
          "text": "This unit takes 3 damage less from ranged attacks to a minimum of 1 damage.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 3,
              "target": "self",
              "from": "rangedAttack",
              "per": "attack",
              "minDamage": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "radiant_swoop",
          "name": "Radiant Swoop",
          "cost": 1,
          "text": "Deals 8 damage. Move one tile for free after the attack. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "timing": "afterAttack"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "corona_flare",
          "name": "Corona Flare",
          "cost": 3,
          "text": "Heal up to 10 damage from this unit. Then, subtract that number from 10 and deal that much damage to all surrounding units.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": 10,
              "upTo": true
            },
            {
              "type": "damage",
              "amount": {
                "formula": "10 - healed"
              },
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "shimmering_bulwark",
      "set": "Fury of the Skies",
      "name": "Shimmering Bulwark",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Solar"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/shimmering_bulwark.png",
      "passives": [
        {
          "id": "golden_standard",
          "name": "Golden Standard",
          "trigger": "static",
          "text": "Friendly units surrounding this unit take 1 damage less from melee attacks.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "friendlyUnitsSurroundingSelf",
              "from": "meleeAttack",
              "per": "attack"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "sunlight_tactics",
          "name": "Sunlight Tactics",
          "cost": 1,
          "text": "Use a 1AP ability of the promoted unit for free. If you would gain armour this way and it's the first time it has used this ability this turn, deal that much damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": {
                "cost": 1
              },
              "free": true
            },
            {
              "type": "armourBurst",
              "amount": "armourGained",
              "area": "enemyUnitsSurroundingSelf",
              "if": "gainedArmour&&firstUseThisTurn"
            }
          ]
        },
        {
          "id": "solar_reach",
          "name": "Solar Reach",
          "cost": 2,
          "text": "Deals 8 damage. Armour up to 4.",
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 4
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "master_of_weather",
      "set": "Fury of the Skies",
      "name": "Master of Weather",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Lightning"
          ],
          [
            "Solar"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/master_of_weather.png",
      "passives": [
        {
          "id": "critical_forecast",
          "name": "Critical Forecast",
          "trigger": "self.takesTurn",
          "text": "When this unit takes its turn, choose one of its 1AP abilities. This turn, the first time that ability is used, use it an additional time for free.",
          "effects": [
            {
              "type": "repeatAbility",
              "choose": {
                "cost": 1,
                "from": "self"
              },
              "times": 1,
              "free": true,
              "on": "firstUseThisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "beating_sun",
          "name": "Beating Sun",
          "cost": 1,
          "text": "Deals 3 damage to all units on or surrounding the target tile.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "tile",
          "targetText": "targets tile",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "targetTileAndSurrounding"
            }
          ]
        },
        {
          "id": "violent_storm",
          "name": "Violent Storm",
          "cost": 1,
          "text": "Deals 4 damage to all units along the path.",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        },
        {
          "id": "tornado_sphere",
          "name": "Tornado Sphere",
          "cost": 3,
          "text": "Your opponent cannot choose the target to take their next turn unless it is their last non-token unit.",
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "unit",
          "effects": [
            {
              "type": "denyTurnSelection",
              "target": "hitUnit",
              "duration": "opponentNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "gelatinous_blimp",
      "set": "Fury of the Skies",
      "name": "Gelatinous Blimp",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Nimbus"
          ],
          [
            "Ooze"
          ]
        ]
      },
      "hp": 30,
      "ap": 3,
      "art": "art/gelatinous_blimp.png",
      "passives": [
        {
          "id": "bouncy_membrane",
          "name": "Bouncy Membrane",
          "trigger": "self.takesDamageFromMeleeAttack",
          "text": "Whenever this unit takes damage from a melee attack, apply knockback 1 to the attacker.",
          "effects": [
            {
              "type": "knockback",
              "target": "attacker",
              "distance": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "toxic_drizzle",
          "name": "Toxic Drizzle",
          "cost": 1,
          "text": "Deals 4 damage to all units on or surrounding the target tile.",
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "tile",
          "targetText": "targets tile",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "targetTileAndSurrounding"
            }
          ]
        },
        {
          "id": "smothering_drop",
          "name": "Smothering Drop",
          "cost": 2,
          "text": "Place this unit on the target tile. Deal 6 damage to all surrounding enemy units and apply knockback 1 to each.",
          "target": "emptyTile",
          "targetText": "empty tile target",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            },
            {
              "type": "knockback",
              "target": "areaHitUnits",
              "distance": 1
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "rimewind_direwyrm",
      "set": "Fury of the Skies",
      "name": "Rimewind Direwyrm",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Drakeling"
          ],
          [
            "Frozen"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/rimewind_direwyrm.png",
      "passives": [
        {
          "id": "windchill",
          "name": "Windchill",
          "trigger": "enemyUnitStartsTurnSurroundingSelf",
          "text": "Whenever an enemy unit begins its turn surrounding this unit, it starts its turn with 1 less AP (to a minimum of 1).",
          "effects": [
            {
              "type": "loseAP",
              "target": "thatUnit",
              "amount": 1,
              "minAP": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "frostbite_fangs",
          "name": "Frostbite Fangs",
          "cost": 1,
          "text": "Deals 5 damage. If the target has exactly 1 or 2 AP on its next turn, this attack deals an additional 3 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "if": "target.apNextTurnIs:1,2",
                  "addAmount": 3
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "glacial_wings",
          "name": "Glacial Wings",
          "cost": 2,
          "text": "Move up to 3 tiles in a straight line, ignoring units in the way. Deal 5 damage to all enemy units passed through. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "path": {
                "directionChanges": 0
              },
              "mayMoveOverUnits": true,
              "damageToEnemiesMovedOver": 5,
              "finalTileMustBeEmpty": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "biogenic_mass",
      "set": "Fury of the Skies",
      "name": "Biogenic Mass",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Ooze"
          ],
          [
            "Plant"
          ]
        ]
      },
      "hp": 20,
      "ap": 3,
      "art": "art/biogenic_mass.png",
      "passives": [
        {
          "id": "adaptive_mucus",
          "name": "Adaptive Mucus",
          "trigger": "self.takesDamageFromAttack",
          "text": "Whenever this unit takes damage from an attack, it armours up to 3 immediately after the damage.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 3,
              "timing": "afterAttackResolves"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "tugging_vine",
          "name": "Tugging Vine",
          "cost": 1,
          "text": "Deals 4 damage. Pull the target 1 tile toward this unit.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "pull",
              "target": "hitUnit",
              "distance": 1
            }
          ]
        },
        {
          "id": "overgrowth_spores",
          "name": "Overgrowth Spores",
          "cost": 2,
          "text": "Deals 5 damage. This unit heals 5 damage.",
          "target": "enemyUnit",
          "targetCount": {
            "max": 2,
            "distinct": true
          },
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 5
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "zigzag_cavalry",
      "set": "Fury of the Skies",
      "name": "Zigzag Cavalry",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Lancer"
          ],
          [
            "Lightning"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/zigzag_cavalry.png",
      "passives": [
        {
          "id": "conductive_charge",
          "name": "Conductive Charge",
          "trigger": "self.movesInNewDirectionThisTurn",
          "text": "Whenever this unit moves in a direction for the first time each turn, it deals 2 damage to all surrounding units after moving.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "allUnitsSurroundingSelf",
              "timing": "afterMoving"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "volt_swords",
          "name": "Volt Swords",
          "cost": 1,
          "text": "Deals 5 damage. Hits twice if this unit has moved this turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "if": "self.movedThisTurn",
                  "setHits": 2
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "lightning_joust",
          "name": "Lightning Joust",
          "cost": 2,
          "text": "Move up to 3 tiles, always changing direction. Then, deal 4 damage per tile moved to the unit in the last direction travelled.",
          "targetText": "a path of up to 3 tiles, changing direction every tile",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "path": {
                "noSameDirectionTwiceInARow": true
              },
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true
            },
            {
              "type": "damage",
              "amount": {
                "perTileMoved": 4
              },
              "hits": 1,
              "target": "unitInLastDirectionMoved"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "arbiter_of_transience",
      "set": "Fury of the Skies",
      "name": "Arbiter of Transience",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Solar"
          ],
          [
            "Lunar"
          ]
        ]
      },
      "hp": 22,
      "ap": 3,
      "art": "art/arbiter_of_transience.png",
      "passives": [
        {
          "id": "shifting_flow",
          "name": "Shifting Flow",
          "trigger": "static",
          "text": "If this unit has an even amount of HP remaining, its attacks deal an additional 2 damage. If it has an odd amount of HP remaining, it takes 2 damage less from all attacks.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "self.hpRemainingIsEven"
            },
            {
              "type": "reduceDamage",
              "amount": 2,
              "target": "self",
              "from": "attack",
              "per": "attack",
              "if": "self.hpRemainingIsOdd"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "twilight_strike",
          "name": "Twilight Strike",
          "cost": 1,
          "text": "Deals 5 damage. Heal up to 1 damage from this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "total_eclipse",
          "name": "Total Eclipse",
          "cost": 2,
          "text": "Deals 5 damage to all units on or surrounding the target tile. Then, armour up to 3.",
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "tile",
          "targetText": "targets tile",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "targetTileAndSurrounding"
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "rampant_weretiger",
      "set": "Fury of the Skies",
      "name": "Rampant Weretiger",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Lunar"
          ],
          [
            "Wildcat"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/rampant_weretiger.png",
      "passives": [
        {
          "id": "blood_moon_frenzy",
          "name": "Blood Moon Frenzy",
          "trigger": "self.attacksSameUnitTwiceInTurn",
          "text": "When this unit attacks a unit for the second time in the same turn, it may move 1 tile for free.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "optional": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "savage_swipe",
          "name": "Savage Swipe",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "prowl",
          "name": "Prowl",
          "cost": 1,
          "text": "Move exactly 2 tiles. Armour up to 3.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "path": {},
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "tempest_incarnate",
      "set": "Fury of the Skies",
      "name": "Tempest Incarnate",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Lightning"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/tempest_incarnate.png",
      "passives": [
        {
          "id": "living_squall",
          "name": "Living Squall",
          "trigger": "self.movesOnOwnTurn",
          "text": "When this unit moves during its turn, it deals 2 damage to all enemy units surrounding the tile it lands on.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "enemyUnitsSurroundingLandingTile"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "sparkshooter",
          "name": "Sparkshooter",
          "cost": 1,
          "text": "Deals 1 damage. Hits 6 times.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 6
            }
          ]
        },
        {
          "id": "electrified_step",
          "name": "Electrified Step",
          "cost": 1,
          "text": "Move exactly 2 tiles, turning once. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "path": {
                "directionChanges": 1,
                "noReversal": true
              },
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true
            }
          ]
        },
        {
          "id": "lightning_bolt",
          "name": "Lightning Bolt",
          "cost": 2,
          "text": "Deals 11 damage to units on the target tile and 5 damage to each enemy unit surrounding it.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "tile",
          "targetText": "targets tile",
          "effects": [
            {
              "type": "damage",
              "amount": 11,
              "hits": 1,
              "area": "targetTile"
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "enemyUnitsSurroundingTargetTile"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "blustering_gale_spirit",
      "set": "Fury of the Skies",
      "name": "Blustering Gale Spirit",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Nimbus"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/blustering_gale_spirit.png",
      "passives": [
        {
          "id": "tailwind",
          "name": "Tailwind",
          "trigger": "friendlyUnitSurroundingSelfSpendsApToMoveFirstTimeEachTurn",
          "text": "The first time a friendly unit surrounding this one spends AP to move each turn, it may move another tile in the same direction for free.",
          "effects": [
            {
              "type": "move",
              "target": "thatUnit",
              "extraTiles": 1,
              "direction": "same",
              "optional": true,
              "free": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "overpowering_gust",
          "name": "Overpowering Gust",
          "cost": 1,
          "text": "Deals 4 damage. Apply knockback 1 to the target in a chosen direction. Use only once per turn.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "target",
              "distance": 1,
              "direction": "chosen"
            }
          ],
          "isMultiStage": true
        },
        {
          "id": "eye_of_the_storm",
          "name": "Eye of the Storm",
          "cost": 2,
          "text": "Pull all enemy units that are exactly Range 2 from this unit 1 tile toward this unit along a shortest path chosen by its controller. Then deal 5 damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "pull",
              "target": "enemyUnitsAtExactlyRange:2",
              "distance": 1
            },
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "pride_leader_lioness",
      "set": "Fury of the Skies",
      "name": "Pride Leader Lioness",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Wildcat"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/pride_leader_lioness.png",
      "passives": [
        {
          "id": "pride_feast",
          "name": "Pride Feast",
          "trigger": "self.killsEnemyUnit",
          "text": "When this unit kills an enemy unit, friendly units surrounding it heal 3 damage.",
          "effects": [
            {
              "type": "heal",
              "target": "friendlyUnitsSurroundingSelf",
              "amount": 3
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "coordinated_strike",
          "name": "Coordinated Strike",
          "cost": 1,
          "text": "Deals 5 damage. If a friendly unit is also surrounding the target, this attack deals an additional 3 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "if": "target.surroundedByOtherFriendlyUnit",
                  "addAmount": 3
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "roar_of_the_pride",
          "name": "Roar of the Pride",
          "cost": 2,
          "text": "Choose a friendly basic unit. It may immediately use a 1AP melee attack for free.",
          "effects": [
            {
              "type": "grantAction",
              "target": "chosenFriendlyBasicUnit",
              "use": {
                "cost": 1,
                "kind": "attack",
                "melee": true
              },
              "free": true
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "primal_elder_drake",
      "set": "Fury of the Skies",
      "name": "Primal Elder Drake",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Drakeling"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/primal_elder_drake.png",
      "passives": [
        {
          "id": "adamantine_scales",
          "name": "Adamantine Scales",
          "trigger": "static",
          "text": "This unit takes 2 damage less from all attacks on the first hit, to a minimum of 1 damage.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 2,
              "target": "self",
              "from": "attack",
              "scope": "firstHit",
              "minDamage": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "savage_crunch",
          "name": "Savage Crunch",
          "cost": 1,
          "text": "Deals 8 damage. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "infernal_breath",
          "name": "Infernal Breath",
          "cost": 2,
          "text": "Deals 5 damage to all units in the path. Scorch all tiles in the path until the end of your opponent's next turn.",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "allUnitsOnPath"
            },
            {
              "type": "scorchTile",
              "tile": "allTilesOnPath",
              "duration": "untilEndOfOpponentNextTurn",
              "damage": 4
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "sunborn_hierarch",
      "set": "Fury of the Skies",
      "name": "Sunborn Hierarch",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Solar"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/sunborn_hierarch.png",
      "passives": [
        {
          "id": "blinding_brilliance",
          "name": "Blinding Brilliance",
          "trigger": "self.targetedByEnemyAttack",
          "text": "Whenever an enemy unit targets this unit with an attack, that enemy takes 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "target": "attacker"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "searing_ray",
          "name": "Searing Ray",
          "cost": 1,
          "text": "Deals 5 damage.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        },
        {
          "id": "radiant_burst",
          "name": "Radiant Burst",
          "cost": 3,
          "text": "Heal up to 3 damage from this unit and all surrounding friendly units. Deals damage to the target equal to the total amount of damage healed.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "enemyUnit",
          "effects": [
            {
              "type": "heal",
              "target": "selfAndFriendlyUnitsSurroundingSelf",
              "amount": 3
            },
            {
              "type": "damage",
              "amount": "totalHealed",
              "hits": 1,
              "area": "targetUnit"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "nightruler_cobra",
      "set": "Fury of the Skies",
      "name": "Nightruler Cobra",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Lunar"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/nightruler_cobra.png",
      "passives": [
        {
          "id": "hypnotic_sway",
          "name": "Hypnotic Sway",
          "trigger": "static",
          "text": "Enemy units surrounding this unit cannot use abilities that cost 2 or more AP.",
          "effects": [
            {
              "type": "cannotUseAbilities",
              "target": "enemyUnitsSurroundingSelf",
              "minCost": 2
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "puncturing_fangs",
          "name": "Puncturing Fangs",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "numbing_venom",
          "name": "Numbing Venom",
          "cost": 1,
          "text": "Deals 4 damage. The target's attacks deal 2 damage less on the first hit during its next turn. Use only against a unit that this unit has already targeted this turn.",
          "requires": "target.attackedBySelfThisTurn",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "reduceDamageDealt",
              "target": "hitUnit",
              "amount": 2,
              "scope": "firstHit",
              "appliesTo": "itsAttacks",
              "duration": "itsNextTurn"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "slither_in_shadows",
          "name": "Slither in Shadows",
          "cost": 1,
          "text": "Move up to 3 tiles, never going in the same direction twice in a row.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "path": {
                "noSameDirectionTwiceInARow": true
              },
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "double_dragoon",
      "set": "Fury of the Skies",
      "name": "Double Dragoon",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Lancer"
          ]
        ]
      },
      "hp": 25,
      "ap": 3,
      "art": "art/double_dragoon.png",
      "passives": [
        {
          "id": "extreme_momentum",
          "name": "Extreme Momentum",
          "trigger": "self.spendsApToMove",
          "text": "Whenever this unit spends AP to move, it may armour up to 2, then move another tile in the same direction for free.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 2,
              "optional": true
            },
            {
              "type": "move",
              "target": "self",
              "extraTiles": 1,
              "direction": "same",
              "optional": true,
              "free": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "red_thirst",
          "name": "Red Thirst",
          "cost": 1,
          "text": "Deals 7 damage. Heal 3 damage from this unit. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 3
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "blue_pierce",
          "name": "Blue Pierce",
          "cost": 1,
          "text": "Deals 3 damage. Hits twice. The first hit bypasses armour.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2,
              "firstHitBypassesArmour": true
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "twin_lance_combo",
          "name": "Twin-Lance Combo",
          "cost": 1,
          "text": "Deals 2 damage for each tile this unit has moved this turn. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 0,
              "hits": 2,
              "modifiers": [
                {
                  "addAmount": {
                    "perTileMovedThisTurn": 2
                  }
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "phalanx_greatooze",
      "set": "Fury of the Skies",
      "name": "Phalanx Greatooze",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Ooze"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/phalanx_greatooze.png",
      "passives": [
        {
          "id": "self_contained_formation",
          "name": "Self-Contained Formation",
          "trigger": "self.gainsArmourFirstTimeEachTurn",
          "text": "The first time this unit gains armour each turn, it may use a 1AP ability from among the promoted units for free.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1
              },
              "free": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "drive_back",
          "name": "Drive Back",
          "cost": 1,
          "text": "Deals 7 damage. Knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "unbreakable_line",
          "name": "Unbreakable Line",
          "cost": 1,
          "text": "Gain 2 armour, to a maximum of 12 armour.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "amount": 2,
              "max": 12
            }
          ]
        },
        {
          "id": "colossal_hedgehog",
          "name": "Colossal Hedgehog",
          "cost": 2,
          "text": "Deals 3 damage to units on all target tiles. Hits 3 times.",
          "target": "tile",
          "targetText": "3 tile targets each surrounding at least 1 other",
          "targetCount": {
            "exactly": 3,
            "eachSurroundingAnother": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 3,
              "area": "targetTiles"
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "radiant_shine_avatar",
      "set": "Fury of the Skies",
      "name": "Radiant Shine Avatar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": [
          [
            "Solar"
          ],
          [
            "Knight"
          ]
        ]
      },
      "hp": 32,
      "ap": 4,
      "art": "art/radiant_shine_avatar.png",
      "passives": [
        {
          "id": "shining_supremacy",
          "name": "Shining Supremacy",
          "trigger": "static",
          "text": "The first ranged attack against this unit each turn can only deal a maximum of 4 damage (total, for all hits).",
          "effects": [
            {
              "type": "capDamage",
              "target": "self",
              "max": 4,
              "from": "rangedAttack",
              "scope": "firstRangedAttackEachTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "cloudsplitter_glaive",
          "name": "Cloudsplitter Glaive",
          "cost": 1,
          "text": "Deals 7 damage. If this is the first attack this unit has used this turn, any time it deals damage, it deals 5 damage to the enemy unit on the other side of the target (if there is one).",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "mirrorDamage",
              "target": "enemyBehindTarget",
              "if": "attackNumberThisTurn:1",
              "amount": 5
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "twisting_dragontrail",
          "name": "Twisting Dragontrail",
          "cost": 3,
          "text": "This unit moves 3-5 tiles (your choice), changing direction one or two times but never turning back the way it came. It may move over units in the way, and moving over an enemy unit deals 8 damage to that unit. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "min": 3,
                "max": 5
              },
              "path": {
                "directionChanges": [
                  1,
                  2
                ],
                "noReversal": true
              },
              "mayMoveOverUnits": true,
              "damageToEnemiesMovedOver": 8,
              "finalTileMustBeEmpty": true
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "serene_glow_avatar",
      "set": "Fury of the Skies",
      "name": "Serene Glow Avatar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": [
          [
            "Lunar"
          ],
          [
            "Assassin"
          ]
        ]
      },
      "hp": 32,
      "ap": 4,
      "art": "art/serene_glow_avatar.png",
      "passives": [
        {
          "id": "night_adders_path",
          "name": "Night-Adder's Path",
          "trigger": "self.spendsApToMove",
          "text": "Any time this unit spends AP to move on its turn, choose a tile in a different direction. Apply knockback 1 to any unit on that tile, then, if it is empty, move this unit to that tile for free.",
          "effects": [
            {
              "type": "knockback",
              "target": "unitOnChosenTileInDifferentDirection",
              "distance": 1
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "if": "thatTileEmpty"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "crescent_blade",
          "name": "Crescent Blade",
          "cost": 1,
          "text": "Deals 4 damage, then hits again for 3 damage. If this attack targets a unit that was knocked back by this unit this turn, it deals an additional 1 damage per hit.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "extraHit": {
                "amount": 3
              },
              "modifiers": [
                {
                  "if": "target.knockedBackBySelfThisTurn",
                  "addAmountPerHit": 1
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "shadow_emergence",
          "name": "Shadow Emergence",
          "cost": 1,
          "text": "Place this unit on the target tile. Use only as the second action in a turn.",
          "range": [
            1,
            9
          ],
          "rangeText": "9",
          "target": "unit",
          "targetText": "targets empty tile behind an enemy unit",
          "effects": [
            {
              "type": "place",
              "target": "self",
              "tile": "tileBehindTarget",
              "if": "tileBehindTarget.isEmpty"
            }
          ],
          "requires": "thisIsNthActionOfTurn:2"
        },
        {
          "id": "bask_in_moonlight",
          "name": "Bask in Moonlight",
          "cost": 3,
          "text": "Deals 9 damage to all enemy units surrounding this one. For each unit hit, this unit heals 3 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 9,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            },
            {
              "type": "heal",
              "target": "self",
              "amount": {
                "perUnitHit": 3
              }
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "skeleton_fighter",
      "set": "Soul Festival 2026",
      "name": "Skeleton Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/skeleton_fighter.png",
      "passives": [
        {
          "id": "reassemble",
          "name": "Reassemble",
          "trigger": "self.dies",
          "text": "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for free. When this unit is reinforced this way, place 8 damage on it.",
          "effects": [
            {
              "type": "reassemble",
              "discard": 1,
              "damage": 8
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "rickety_spin",
          "name": "Rickety Spin",
          "cost": 1,
          "text": "Deals 3 damage. Hits 2 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "hair_puller",
          "name": "Hair Puller",
          "cost": 2,
          "text": "Deals 1 damage. Heal up to 8 damage from this unit (this attack must have a target).",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 8
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Skeleton",
        "Fighter"
      ]
    },
    {
      "id": "skeleton_drakeling",
      "set": "Soul Festival 2026",
      "name": "Skeleton Drakeling",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 15,
      "ap": 2,
      "art": "art/skeleton_drakeling.png",
      "passives": [
        {
          "id": "reassemble",
          "name": "Reassemble",
          "trigger": "self.dies",
          "text": "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for free. When this unit is reinforced this way, place 7 damage on it.",
          "effects": [
            {
              "type": "reassemble",
              "discard": 1,
              "damage": 7
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "bony_claws",
          "name": "Bony Claws",
          "cost": 1,
          "text": "Deals 4 damage. Hits again for 3 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "extraHit": {
                "amount": 3
              }
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "haunting_dive",
          "name": "Haunting Dive",
          "cost": 1,
          "text": "Move up to 2 tiles in a straight line, moving over units in the way. If you move over an enemy unit this way, deal 4 damage to it, and if it takes the next turn, moving costs an additional 1AP first time it moves that turn. This ability must leave this unit alone on its tile. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 2
              },
              "path": {
                "directionChanges": 0
              },
              "mayMoveOverUnits": true,
              "damageToEnemiesMovedOver": 4,
              "statusOnEnemiesMovedOver": "move_tax",
              "finalTileMustBeEmpty": true
            }
          ]
        }
      ],
      "classTags": [
        "Skeleton",
        "Drakeling"
      ]
    },
    {
      "id": "skeleton_sage",
      "set": "Soul Festival 2026",
      "name": "Skeleton Sage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 12,
      "ap": 2,
      "art": "art/skeleton_sage.png",
      "passives": [
        {
          "id": "reassemble",
          "name": "Reassemble",
          "trigger": "self.dies",
          "text": "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for free. When this unit is reinforced this way, place 6 damage on it.",
          "effects": [
            {
              "type": "reassemble",
              "discard": 1,
              "damage": 6
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "xylobone_rehearsal",
          "name": "Xylobone Rehearsal",
          "cost": 1,
          "text": "Deals 2 damage. Hits 2 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "chilling_insight",
          "name": "Chilling Insight",
          "cost": 2,
          "text": "Choose a basic unit card from your graveyard and return it to your hand.",
          "target": "self",
          "effects": [
            {
              "type": "returnFromGraveyard",
              "filter": {
                "basic": true
              },
              "to": "hand",
              "count": 1
            }
          ]
        }
      ],
      "classTags": [
        "Skeleton",
        "Sage"
      ]
    },
    {
      "id": "calcified_skeleton",
      "set": "Soul Festival 2026",
      "name": "Calcified Skeleton",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/calcified_skeleton.png",
      "passives": [
        {
          "id": "reassemble",
          "name": "Reassemble",
          "trigger": "self.dies",
          "text": "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for free. When this unit is reinforced this way, place 10 damage on it.",
          "effects": [
            {
              "type": "reassemble",
              "discard": 1,
              "damage": 10
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "bone_bash",
          "name": "Bone Bash",
          "cost": 1,
          "text": "Deals 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "two_hundred_six_pickup",
          "name": "Two Hundred Six Pickup",
          "cost": 2,
          "text": "Deals 6 damage to this unit and all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "selfAndAllUnitsSurroundingSelf"
            }
          ]
        },
        {
          "id": "hair_yank",
          "name": "Hair Yank",
          "cost": 2,
          "text": "Deals 1 damage. Heal up to 10 damage from this unit (this attack must have a target).",
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 10
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Calcified",
        "Skeleton"
      ]
    },
    {
      "id": "skeleton_archer",
      "set": "Soul Festival 2026",
      "name": "Skeleton Archer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 14,
      "ap": 2,
      "art": "art/skeleton_archer.png",
      "passives": [
        {
          "id": "reassemble",
          "name": "Reassemble",
          "trigger": "self.dies",
          "text": "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for free. When this unit is reinforced this way, place 7 damage on it.",
          "effects": [
            {
              "type": "reassemble",
              "discard": 1,
              "damage": 7
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "grim_shot",
          "name": "Grim Shot",
          "cost": 1,
          "text": "Deals 5 damage.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ]
        },
        {
          "id": "deathly_barrage",
          "name": "Deathly Barrage",
          "cost": 2,
          "text": "Deals 3 damage to all units on or surrounding the target tile. Hits twice.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "tile",
          "targetText": "targets tile",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2,
              "area": "targetTileAndSurrounding"
            }
          ]
        }
      ],
      "classTags": [
        "Skeleton",
        "Archer"
      ]
    },
    {
      "id": "arcane_skeleton",
      "set": "Soul Festival 2026",
      "name": "Arcane Skeleton",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/arcane_skeleton.png",
      "passives": [
        {
          "id": "reassemble",
          "name": "Reassemble",
          "trigger": "self.dies",
          "text": "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for free. When this unit is reinforced this way, place 9 damage on it.",
          "effects": [
            {
              "type": "reassemble",
              "discard": 1,
              "damage": 9
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "bone_rake",
          "name": "Bone Rake",
          "cost": 1,
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "soul_harvest",
          "name": "Soul Harvest",
          "cost": 2,
          "text": "Deals 7 damage. Heal up to 3 damage from this unit.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 3
            }
          ]
        }
      ],
      "classTags": [
        "Arcane",
        "Skeleton"
      ]
    },
    {
      "id": "ghost_knight",
      "set": "Soul Festival 2026",
      "name": "Ghost Knight",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/ghost_knight.png",
      "passives": [
        {
          "id": "haunting_clank",
          "name": "Haunting Clank",
          "trigger": "static",
          "text": "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, move it to an empty surrounding tile for free, then it armours up to 3.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "armour",
                  "target": "self",
                  "upTo": 3
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "spectral_blade",
          "name": "Spectral Blade",
          "cost": 1,
          "text": "Deals 5 damage. Bypasses up to 3 armour.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "bypassArmourUpTo",
              "amount": 3
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "induce_fear",
          "name": "Induce Fear",
          "cost": 0,
          "text": "The target unit gets \"Passive- Mindless: This unit cannot use the Universal Draw Action.\" during your opponent's next turn. Use only once per turn.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "giveMindless",
              "target": "hitUnit",
              "duration": "opponentNextTurn"
            }
          ]
        }
      ],
      "classTags": [
        "Ghost",
        "Knight"
      ]
    },
    {
      "id": "ghost_plunderer",
      "set": "Soul Festival 2026",
      "name": "Ghost Plunderer",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
      "ap": 2,
      "art": "art/ghost_plunderer.png",
      "passives": [
        {
          "id": "pirates_curse",
          "name": "Pirate's Curse",
          "trigger": "static",
          "text": "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, this unit deals the other unit on its tile 4 damage, then move this unit to an empty surrounding tile for free, then you loot 2.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "damage",
                  "target": "otherUnitOnTile",
                  "amount": 4
                },
                {
                  "type": "loot",
                  "amount": 2
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "haunting_cutlass",
          "name": "Haunting Cutlass",
          "cost": 1,
          "text": "Deals 3 damage. Hits again for 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": {
                "amount": 2
              }
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "treasure_trail",
          "name": "Treasure Trail",
          "cost": 1,
          "text": "Move this unit 2 tiles for free. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "path": {},
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true,
              "free": true
            }
          ]
        }
      ],
      "classTags": [
        "Ghost",
        "Plunderer"
      ]
    },
    {
      "id": "ghost_assassin",
      "set": "Soul Festival 2026",
      "name": "Ghost Assassin",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/ghost_assassin.png",
      "passives": [
        {
          "id": "deathly_shiver",
          "name": "Deathly Shiver",
          "trigger": "static",
          "text": "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, this unit deals the other unit on its tile 6 damage, then move this unit to an empty surrounding tile for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "damage",
                  "target": "otherUnitOnTile",
                  "amount": 6
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "ghostly_dagger",
          "name": "Ghostly Dagger",
          "cost": 1,
          "text": "Deals 2 damage. Hits 3 times. If this attack was made from behind the target, move this unit 1 tile for free.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3
            },
            {
              "type": "move",
              "target": "self",
              "distance": 1,
              "free": true,
              "timing": "afterAttack",
              "if": "selfOnTileBehindTarget"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "spectral_phase",
          "name": "Spectral Phase",
          "cost": 1,
          "text": "Move this unit 2 tiles for free. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "path": {},
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true,
              "free": true
            }
          ]
        }
      ],
      "classTags": [
        "Ghost",
        "Assassin"
      ]
    },
    {
      "id": "vindictive_ghost",
      "set": "Soul Festival 2026",
      "name": "Vindictive Ghost",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/vindictive_ghost.png",
      "passives": [
        {
          "id": "malicious_haunting",
          "name": "Malicious Haunting",
          "trigger": "static",
          "text": "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, this unit deals the other unit on its tile 3 damage, armours up to 3, then move this unit to an empty surrounding tile for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "damage",
                  "target": "otherUnitOnTile",
                  "amount": 3
                },
                {
                  "type": "armour",
                  "target": "self",
                  "upTo": 3
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "hateful_slash",
          "name": "Hateful Slash",
          "cost": 1,
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "lock_step",
          "name": "Lock-Step",
          "cost": 1,
          "text": "Deals 4 damage. Until the end of your opponent's next turn, if the target moves, after the move, this unit moves in the same direction for free unless the tile it would land on is occupied.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "lockStep",
              "target": "hitUnit",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Vindictive",
        "Ghost"
      ]
    },
    {
      "id": "ghost_terrifier",
      "set": "Soul Festival 2026",
      "name": "Ghost Terrifier",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
      "ap": 2,
      "art": "art/ghost_terrifier.png",
      "passives": [
        {
          "id": "haunting_cacophony",
          "name": "Haunting Cacophony",
          "trigger": "static",
          "text": "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, if the other unit on its tile took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-token unit (they must choose a different non-token unit if able). Then, move this unit to an empty surrounding tile for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "denyTurnSelection",
                  "target": "otherUnitOnTile",
                  "if": "target.tookLastTurn",
                  "exception": "targetIsLastNonTokenUnit"
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "eardrum_burst",
          "name": "Eardrum Burst",
          "cost": 1,
          "text": "Deals 3 damage to all surrounding enemy units.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        },
        {
          "id": "horrifying_screech",
          "name": "Horrifying Screech",
          "cost": 1,
          "text": "All of your opponent's units get \"Passive- Mindless: This unit cannot use the Universal Draw Action.\" during your opponent's next turn. During your next turn, this unit can't use this ability.",
          "target": "self",
          "effects": [
            {
              "type": "giveMindless",
              "target": "enemyUnits",
              "duration": "opponentNextTurn"
            },
            {
              "type": "lockSelfAbility",
              "duration": "yourNextTurn"
            }
          ]
        }
      ],
      "classTags": [
        "Ghost",
        "Terrifier"
      ]
    },
    {
      "id": "ghost_bruiser",
      "set": "Soul Festival 2026",
      "name": "Ghost Bruiser",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 19,
      "ap": 2,
      "art": "art/ghost_bruiser.png",
      "passives": [
        {
          "id": "ethereal_guard",
          "name": "Ethereal Guard",
          "trigger": "static",
          "text": "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, this unit takes 2 damage less from all attacks until the end of your opponent's next turn, then move this unit to an empty surrounding tile for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "reduceDamageStatus",
                  "amount": 2,
                  "from": "attack",
                  "duration": "untilEndOfOpponentNextTurn"
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "rend_flesh",
          "name": "Rend Flesh",
          "cost": 1,
          "text": "Deals 8 damage. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 8,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "ghost_blade",
          "name": "Ghost Blade",
          "cost": 1,
          "text": "Deals 5 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "spectral_retreat",
          "name": "Spectral Retreat",
          "cost": 2,
          "text": "Move up to 3 tiles, ignoring units in the way. Armour up to 2.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "emptyTile",
          "targetText": "empty tile target (ignores units in the way)",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target",
              "ignoreUnitsInWay": true
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": [
        "Ghost",
        "Bruiser"
      ]
    },
    {
      "id": "alien_mage",
      "set": "Soul Festival 2026",
      "name": "Alien Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 14,
      "ap": 2,
      "art": "art/alien_mage.png",
      "passives": [
        {
          "id": "moissanite_barrier",
          "name": "Moissanite Barrier",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 1.",
          "effects": [
            {
              "type": "armour",
              "target": "self",
              "upTo": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "twisting_beam",
          "name": "Twisting Beam",
          "cost": 1,
          "text": "Deals 3 damage to all units on the path.",
          "usesPath": true,
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "target": "tile",
          "targetText": "path, never the same direction twice",
          "pathRule": "noSameDirectionTwice",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        },
        {
          "id": "death_ray",
          "name": "Death Ray",
          "cost": 2,
          "text": "Deals 11 damage to the first unit on the path.",
          "straightLine": true,
          "target": "direction",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "targetText": "straight line, first unit within 3",
          "effects": [
            {
              "type": "damage",
              "amount": 11,
              "hits": 1
            }
          ]
        }
      ],
      "classTags": [
        "Alien",
        "Mage"
      ]
    },
    {
      "id": "alien_ooze",
      "set": "Soul Festival 2026",
      "name": "Alien Ooze",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/alien_ooze.png",
      "passives": [
        {
          "id": "forced_metamorphosis",
          "name": "Forced Metamorphosis",
          "trigger": "static",
          "text": "This unit may promote into any promote unit. If that unit does not promote an ooze, doing this deals 6 damage to the new unit.",
          "effects": [
            {
              "type": "promotableByAnyPromoteUnit",
              "damageIfRequirementIsNot": "Ooze",
              "amount": 6
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "plasma_splash",
          "name": "Plasma Splash",
          "cost": 1,
          "text": "Deals 3 damage to all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            }
          ]
        },
        {
          "id": "synaptic_link",
          "name": "Synaptic Link",
          "cost": 2,
          "text": "Use a 1AP or 2AP ability of the target as this ability for free. Choose promoted units from under that unit if applicable.",
          "target": "anyUnit",
          "targetText": "a unit in melee range (friendly or enemy)",
          "effects": [
            {
              "type": "useAbility",
              "source": "targetUnit",
              "filter": {
                "cost": [
                  1,
                  2
                ]
              },
              "free": true,
              "includeTargetsPromotedCards": true
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Alien",
        "Ooze"
      ]
    },
    {
      "id": "alien_wildcat",
      "set": "Soul Festival 2026",
      "name": "Alien Wildcat",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/alien_wildcat.png",
      "passives": [
        {
          "id": "nine_eyes",
          "name": "Nine Eyes",
          "trigger": "static",
          "text": "If this unit has moved this turn, its melee attacks have an additional 1 range against targets in the direction moved and the 2 other directions on either side of it.",
          "effects": [
            {
              "type": "modifyRange",
              "appliesTo": "meleeAttacks",
              "amount": 1,
              "if": "self.movedThisTurn",
              "directions": "lastMovedAndEitherSide"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "laser_tail",
          "name": "Laser Tail",
          "cost": 1,
          "text": "Deals 3 damage. Then hits again for 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": {
                "amount": 2
              }
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "charged_leap",
          "name": "Charged Leap",
          "cost": 1,
          "text": "This unit moves 2 tiles in a straight line, then armours up to 2. This cannot be the first action this unit takes in a turn.",
          "requires": "notFirstActionOfTurn",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "straightLine": true,
              "finalTileMustBeEmpty": true
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 2
            }
          ]
        }
      ],
      "classTags": [
        "Alien",
        "Wildcat"
      ]
    },
    {
      "id": "alien_invader",
      "set": "Soul Festival 2026",
      "name": "Alien Invader",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/alien_invader.png",
      "passives": [
        {
          "id": "lock_on",
          "name": "Lock-On",
          "trigger": "static",
          "text": "If this unit attacks a unit it has already attacked this turn, it deals an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "damageBonus",
              "appliesTo": "ownAttacks",
              "amount": 2,
              "scope": "firstHit",
              "if": "target.attackedBySelfThisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "ray_gun",
          "name": "Ray Gun",
          "cost": 1,
          "text": "Deals 4 damage.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            }
          ]
        },
        {
          "id": "combat_roll",
          "name": "Combat Roll",
          "cost": 1,
          "text": "If this unit has dealt damage this turn, move 2 spaces for free.",
          "requires": "self.dealtDamageThisTurn",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 2,
              "path": {},
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true,
              "free": true
            }
          ]
        },
        {
          "id": "overheat_blaster",
          "name": "Overheat Blaster",
          "cost": 2,
          "text": "Deals 4 damage. Hits 3 times. You cannot choose this unit to take your next turn unless it is your last non-token unit (you must choose a different non-token unit if able).",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 3
            },
            {
              "type": "denyTurnSelection",
              "target": "self",
              "duration": "yourNextTurnChoice",
              "exception": "targetIsLastNonTokenUnit"
            }
          ]
        }
      ],
      "classTags": [
        "Alien",
        "Invader"
      ]
    },
    {
      "id": "predatory_alien",
      "set": "Soul Festival 2026",
      "name": "Predatory Alien",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 20,
      "ap": 2,
      "art": "art/predatory_alien.png",
      "passives": [
        {
          "id": "chitinous_plating",
          "name": "Chitinous Plating",
          "trigger": "static",
          "text": "This unit takes 1 damage less from melee attacks.",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "meleeAttack",
              "per": "attack"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "tendril_drain",
          "name": "Tendril Drain",
          "cost": 1,
          "text": "Deals 4 damage. Heal up to 1 damage from this unit.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "heal",
              "target": "self",
              "amount": 1
            }
          ]
        },
        {
          "id": "parasitic_enzyme",
          "name": "Parasitic Enzyme",
          "cost": 1,
          "text": "Deals 2 damage. Until the end of the turn, this unit's attacks against the target deal an additional 2 damage per hit. If the target dies this turn, heal up to 4 damage from this unit.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1
            },
            {
              "type": "markTarget",
              "target": "hitUnit",
              "bonusPerHit": 2,
              "duration": "thisTurn",
              "healSelfIfTargetDies": 4
            }
          ]
        }
      ],
      "classTags": [
        "Predatory",
        "Alien"
      ]
    },
    {
      "id": "alien_triblade",
      "set": "Soul Festival 2026",
      "name": "Alien Triblade",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 17,
      "ap": 2,
      "art": "art/alien_triblade.png",
      "passives": [
        {
          "id": "whirling_defenses",
          "name": "Whirling Defenses",
          "trigger": "self.targetedByMeleeAttack",
          "text": "Whenever an enemy unit targets this unit with a melee attack, deal 2 damage to the attacker.",
          "effects": [
            {
              "type": "damage",
              "target": "attacker",
              "amount": 2,
              "hits": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "repeat_jabbing",
          "name": "Repeat Jabbing",
          "cost": 1,
          "text": "Deals 2 damage. Hits 3 times. Use only once each turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "triple_spin",
          "name": "Triple Spin",
          "cost": 1,
          "text": "Deals 3 damage. Hits 3 times. Use only once each turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 3
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": [
        "Alien",
        "Triblade"
      ]
    },
    {
      "id": "conjured_bonelord",
      "set": "Soul Festival 2026",
      "name": "Conjured Bonelord",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Skeleton"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/conjured_bonelord.png",
      "passives": [
        {
          "id": "heartless_gestalt",
          "name": "Heartless Gestalt",
          "trigger": "self.promotesDamagedUnit",
          "text": "When this card promotes a unit with damage on it, discard a card. If you can't, this card goes to the graveyard (the unit it would have promoted stays).",
          "effects": [
            {
              "type": "discardOrFail",
              "trigger": "self.promotesDamagedUnit",
              "failure": "cardToGraveyard"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "heartless_clutches",
          "name": "Heartless Clutches",
          "cost": 1,
          "text": "Deals 6 damage. When this attack targets the same unit twice in a turn, that unit cannot move during its controller's next turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            },
            {
              "type": "cannotMove",
              "target": "hitUnit",
              "if": "thisAbilityUsedOnTargetEarlierThisTurn"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "bonemerang",
          "name": "Bonemerang",
          "cost": 1,
          "text": "Deals 3 damage to each unit on the path (including the unit on the target tile, if there is one). Hits twice. Use only once each turn.",
          "usesPath": true,
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "tile",
          "targetText": "path to a tile",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2,
              "area": "allUnitsOnPath"
            }
          ]
        },
        {
          "id": "25_hundred_bone_pile",
          "name": "25-Hundred-Bone Pile",
          "cost": 2,
          "text": "Deals 13 damage to this unit and all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": 13,
              "hits": 1,
              "area": "selfAndAllUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "clammering_bone_serpent",
      "set": "Soul Festival 2026",
      "name": "Clammering Bone Serpent",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Skeleton"
          ]
        ]
      },
      "hp": 26,
      "ap": 3,
      "art": "art/clammering_bone_serpent.png",
      "passives": [
        {
          "id": "clacking_bones",
          "name": "Clacking Bones",
          "trigger": "self.promotesDamagedUnit",
          "text": "When this card promotes a unit with damage on it, discard a card. If you can't, this card goes to the graveyard (the unit it would have promoted stays).",
          "effects": [
            {
              "type": "discardOrFail",
              "trigger": "self.promotesDamagedUnit",
              "failure": "cardToGraveyard"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "deathly_slither",
          "name": "Deathly Slither",
          "cost": 1,
          "text": "Move this unit up to 2 tiles, then deal 2 damage to this unit and all surrounding enemy units.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "emptyTile",
          "targetText": "move up to 2 tiles",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "tile": "target"
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "self"
            },
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        },
        {
          "id": "undead_fang",
          "name": "Undead Fang",
          "cost": 1,
          "text": "Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "clockwise_sweep",
          "name": "Clockwise Sweep",
          "cost": 1,
          "text": "Deals 4 damage to all surrounding units. Then, applies knockback 1 clockwise around this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            },
            {
              "type": "knockback",
              "target": "areaHitUnits",
              "distance": 1,
              "rotation": "clockwise"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "counter_clockwise_sweep",
          "name": "Counter-clockwise Sweep",
          "cost": 1,
          "text": "Deals 4 damage to all surrounding units. Then, applies knockback 1 counter-clockwise around this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            },
            {
              "type": "knockback",
              "target": "areaHitUnits",
              "distance": 1,
              "rotation": "counterClockwise"
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "wailing_revenant",
      "set": "Soul Festival 2026",
      "name": "Wailing Revenant",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Ghost"
          ]
        ]
      },
      "hp": 22,
      "ap": 3,
      "art": "art/wailing_revenant.png",
      "passives": [
        {
          "id": "spirits_protection",
          "name": "Spirits' Protection",
          "trigger": "self.targetedByMeleeAttack",
          "text": "Up to once per turn, when this unit becomes the target of a melee attack, create an Apparition token on an empty surrounding tile (An Apparition is a token with 8HP, 2AP, and Spooky Attack).",
          "effects": [
            {
              "type": "createToken",
              "token": "apparition",
              "tile": "emptySurroundingSelf"
            }
          ],
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "defensive_thrash",
          "name": "Defensive Thrash",
          "cost": 1,
          "text": "Deals 5 damage. If this is the second time this attack is used on the same unit in a turn, apply knockback 1 to that unit.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1,
              "if": "thisAbilityUsedOnTargetEarlierThisTurn"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "death_wail",
          "name": "Death Wail",
          "cost": 3,
          "text": "All other units in range that are not Apparitions take 9 damage, minus their range from this unit.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "formula": "9 - range"
              },
              "hits": 1,
              "area": "otherUnitsWithinRange:5",
              "excludeTokens": [
                "apparition"
              ]
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "cackling_puppeteer",
      "set": "Soul Festival 2026",
      "name": "Cackling Puppeteer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Ghost"
          ]
        ]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/cackling_puppeteer.png",
      "passives": [
        {
          "id": "hidden_strings",
          "name": "Hidden Strings",
          "trigger": "static",
          "text": "This unit may move over other units. When this unit moves, if it is on a tile with another unit on it, that unit moves with it for free if another unit is not already doing so. If this unit would end its turn while it is not alone on its tile, move this unit to an empty surrounding tile for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "any",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [],
              "carriesUnitOnTile": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "spectral_blow",
          "name": "Spectral Blow",
          "cost": 1,
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "stage_hook",
          "name": "Stage Hook",
          "cost": 1,
          "text": "Move the target unit 1 tile closer to this one if able.",
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "unit",
          "effects": [
            {
              "type": "pull",
              "target": "hitUnit",
              "distance": 1,
              "asMove": true
            }
          ]
        },
        {
          "id": "prankster_step",
          "name": "Prankster Step",
          "cost": 1,
          "text": "Move this unit up to 3 tiles for free. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "path": {},
              "mayMoveOverUnits": false,
              "finalTileMustBeEmpty": true,
              "free": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "assault_lander",
      "set": "Soul Festival 2026",
      "name": "Assault Lander",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Alien"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/assault_lander.png",
      "passives": [
        {
          "id": "trampling_path",
          "name": "Trampling Path",
          "trigger": "static",
          "text": "While moving, this unit may choose a tile occupied by an enemy unit. If it does, apply knockback 1 to the unit on that tile. Then, if it is empty, armour up to 4 and move this unit to the tile.",
          "effects": [
            {
              "type": "tramplingMove",
              "knockback": 1,
              "armourUpTo": 4
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "release_neurotoxin",
          "name": "Release Neurotoxin",
          "cost": 1,
          "text": "Deals 4 damage to all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            }
          ]
        },
        {
          "id": "laser_artillery",
          "name": "Laser Artillery",
          "cost": 2,
          "text": "Deals 4 damage to each unit on a target tile. Then hits again for 3 damage.",
          "range": [
            1,
            5
          ],
          "rangeText": "1-5",
          "target": "tile",
          "targetText": "up to 3 tile targets, none surrounding another",
          "targetCount": {
            "max": 3,
            "noneSurroundingAnother": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "targetTiles",
              "extraHit": {
                "amount": 3
              }
            }
          ]
        },
        {
          "id": "focused_barrage",
          "name": "Focused Barrage",
          "cost": 3,
          "text": "Deals 4 damage to the first unit on the path. Hits 5 times. Each time a hit kills a unit, the next one hits the next unit on the path instead (if there is one).",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 5,
              "area": "firstUnitOnPathCarryOver"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "soundwave_shock_trooper",
      "set": "Soul Festival 2026",
      "name": "Soundwave Shock Trooper",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [
          [
            "Alien"
          ]
        ]
      },
      "hp": 21,
      "ap": 3,
      "art": "art/soundwave_shock_trooper.png",
      "passives": [
        {
          "id": "ear_ringer",
          "name": "Ear Ringer",
          "trigger": "self.damagesEnemyUnit",
          "text": "Whenever an enemy unit is damaged by this one, that unit must spend an additional 1AP to use the Universal Draw Action until the end of your opponent's next turn.",
          "effects": [
            {
              "type": "increaseDrawCost",
              "target": "damagedUnit",
              "amount": 1,
              "duration": "untilEndOfOpponentNextTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "treble_trauma",
          "name": "Treble Trauma",
          "cost": 1,
          "text": "Deals 4 damage to all units on the path.",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        },
        {
          "id": "bass_tremor",
          "name": "Bass Tremor",
          "cost": 2,
          "text": "Deals 5 damage to all units in range. Then, apply knockback 1 to all surrounding units.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "area": "allUnitsWithinRange:2"
            },
            {
              "type": "knockback",
              "target": "allUnitsSurroundingSelf",
              "distance": 1
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "ossified_direwyrm",
      "set": "Soul Festival 2026",
      "name": "Ossified Direwyrm",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Skeleton"
          ],
          [
            "Drakeling"
          ]
        ]
      },
      "hp": 28,
      "ap": 3,
      "art": "art/ossified_direwyrm.png",
      "passives": [
        {
          "id": "solid_ribcage",
          "name": "Solid Ribcage",
          "trigger": "multiple",
          "text": "When you reinforce this card, discard a card. If you can't, this card goes to the graveyard (the units it would have fused stay). Reduces all damage taken from enemy attacks by 1, to a minimum of 1 damage per hit.",
          "effects": [
            {
              "type": "discardOrFail",
              "trigger": "self.reinforced",
              "failure": "cardToGraveyard"
            },
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "attack",
              "per": "hit",
              "minDamage": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "dire_claws",
          "name": "Dire Claws",
          "cost": 1,
          "text": "Use a 1AP ability of the promoted drakeling as this ability for free, except it deals an additional 1 damage per hit.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "fromCard": "Drakeling"
              },
              "free": true,
              "addDamage": {
                "amount": 1,
                "scope": "allHits"
              }
            }
          ]
        },
        {
          "id": "necrotic_breath",
          "name": "Necrotic Breath",
          "cost": 2,
          "text": "Deals 11 damage to the first unit on the path.",
          "usesPath": true,
          "range": [
            1,
            2
          ],
          "rangeText": "2",
          "target": "tile",
          "targetText": "path to a tile",
          "effects": [
            {
              "type": "damage",
              "amount": 11,
              "hits": 1,
              "area": "firstUnitOnPath"
            }
          ]
        },
        {
          "id": "bone_dust_landing",
          "name": "Bone-Dust Landing",
          "cost": 2,
          "text": "Move up to 3 tiles in a straight line for free. Deal 4 damage to this unit, then deal 8 damage to all enemy units surrounding this unit.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "straightLine": true,
              "free": true
            },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "area": "self"
            },
            {
              "type": "damage",
              "amount": 8,
              "hits": 1,
              "area": "enemyUnitsSurroundingSelf"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "deadly_brain_symbiote",
      "set": "Soul Festival 2026",
      "name": "Deadly Brain Symbiote",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Alien"
          ],
          [
            "Ooze"
          ]
        ]
      },
      "hp": 27,
      "ap": 3,
      "art": "art/deadly_brain_symbiote.png",
      "passives": [
        {
          "id": "consume_prey",
          "name": "Consume Prey",
          "trigger": "self.killsEnemyUnit",
          "text": "When this unit kills an enemy unit, it heals up to 3 and armours up to 3.",
          "effects": [
            {
              "type": "heal",
              "target": "self",
              "amount": 3
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": 3
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "hybrid_fists",
          "name": "Hybrid Fists",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "ground_rupture",
          "name": "Ground Rupture",
          "cost": 2,
          "text": "Deals 9 damage. If the target takes the next turn, it must spend an additional 1AP on its first action that turn.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "effects": [
            {
              "type": "damage",
              "amount": 9,
              "hits": 1
            },
            {
              "type": "increaseActionCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstActionOfTurn"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "terrifying_executioner",
      "set": "Soul Festival 2026",
      "name": "Terrifying Executioner",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [
          [
            "Assassin"
          ],
          [
            "Ghost"
          ]
        ]
      },
      "hp": 24,
      "ap": 3,
      "art": "art/terrifying_executioner.png",
      "passives": [
        {
          "id": "bloodlust",
          "name": "Bloodlust",
          "trigger": "self.killsEnemyUnit",
          "text": "When this unit kills an enemy unit, it gains 1AP. This can only happen once per turn.",
          "effects": [
            {
              "type": "gainAP",
              "target": "self",
              "amount": 1
            }
          ],
          "limits": {
            "oncePerTurn": true
          }
        }
      ],
      "abilities": [
        {
          "id": "disembowel",
          "name": "Disembowel",
          "cost": 1,
          "text": "Deals 6 damage. If this attack is made from behind, it deals an additional 2 damage and you may have it apply knockback 1.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "modifiers": [
                {
                  "if": "selfOnTileBehindTarget",
                  "addAmount": 2,
                  "scope": "firstHit"
                }
              ]
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1,
              "optional": true,
              "if": "selfOnTileBehindTarget"
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "hundred_cut_crescendo",
          "name": "Hundred-Cut Crescendo",
          "cost": 2,
          "text": "Deals 4 damage. Hits 4 times. Each time this attack hits, if the target no longer has any armour, it deals an additional 1 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 4,
              "modifiers": [
                {
                  "if": "target.noArmour",
                  "addAmount": 1,
                  "checkedAt": "eachHit"
                }
              ]
            }
          ],
          "tags": [
            "melee",
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "skull_union_monarchy",
      "set": "Soul Festival 2026",
      "name": "Skull-Union Monarchy",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Skeleton"
          ],
          [
            "Skeleton"
          ],
          [
            "*"
          ]
        ]
      },
      "hp": 36,
      "ap": 4,
      "art": "art/skull_union_monarchy.png",
      "passives": [
        {
          "id": "posthumous_prerogative",
          "name": "Posthumous Prerogative",
          "trigger": "multiple",
          "text": "When you reinforce this card, discard a card. If you can't, this card goes to the graveyard (the units it would have fused stay). When this unit starts its turn, choose an enemy unit. That unit's passives have no effect this turn.",
          "effects": [
            {
              "type": "discardOrFail",
              "trigger": "self.reinforced",
              "failure": "cardToGraveyard"
            },
            {
              "type": "removePassives",
              "trigger": "self.takesTurn",
              "target": "chosenEnemyUnit",
              "duration": "thisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "reaper_swing",
          "name": "Reaper Swing",
          "cost": 1,
          "text": "Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "underworld_blade",
          "name": "Underworld Blade",
          "cost": 1,
          "text": "Use a 1AP attack from among the promoted units as this ability for free, except treat it as though it had range 1-4. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "target": "unit",
          "range": [
            1,
            4
          ],
          "rangeText": "1-4",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "rangeOverride": [
                1,
                4
              ]
            }
          ]
        },
        {
          "id": "borrowing_100000_bones",
          "name": "Borrowing 100,000 Bones",
          "cost": 3,
          "text": "Deals damage to all surrounding units equal to the damage on this unit. Then, deals 3 damage to this unit. This unit's turn ends.",
          "effects": [
            {
              "type": "damage",
              "amount": {
                "perDamageOnSelf": 1
              },
              "hits": 1,
              "area": "allUnitsSurroundingSelf"
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "self"
            },
            {
              "type": "endTurn",
              "target": "self"
            }
          ],
          "tags": [
            "inspiring"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "tally_ho_laser_squad",
      "set": "Soul Festival 2026",
      "name": "Tally-Ho Laser Squad",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Alien"
          ],
          [
            "Alien"
          ],
          [
            "*"
          ]
        ]
      },
      "hp": 31,
      "ap": 4,
      "art": "art/tally_ho_laser_squad.png",
      "passives": [
        {
          "id": "automatic_shields",
          "name": "Automatic Shields",
          "trigger": "static",
          "text": "When an enemy unit attacks this unit, that attack deals 1 damage less on the first hit to a minimum of 1 damage unless that unit is behind this one (from the attacker's perspective).",
          "effects": [
            {
              "type": "reduceDamage",
              "amount": 1,
              "target": "self",
              "from": "attack",
              "scope": "firstHit",
              "minDamage": 1,
              "if": "!attacker.behindSelf"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "guard_the_payload",
          "name": "Guard the Payload",
          "cost": 1,
          "text": "Use 2 different 1AP abilities from among the promoted cards as this ability for free. Attacks chosen this way must be legal against the target. If this ability has already been used this turn, instead only use 1 ability this way.",
          "range": [
            1,
            1
          ],
          "rangeText": "1",
          "target": "unit",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1
              },
              "free": true,
              "times": 2,
              "distinct": true,
              "sameTargetForAttacks": true,
              "timesIfUsedEarlierThisTurn": 1
            }
          ]
        },
        {
          "id": "maximum_intensity",
          "name": "Maximum Intensity",
          "cost": 3,
          "text": "Deals 11 damage to each unit on the path.",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            9
          ],
          "rangeText": "9",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 11,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "revenant_trio",
      "set": "Soul Festival 2026",
      "name": "Revenant Trio",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [
          [
            "Ghost"
          ],
          [
            "Ghost"
          ],
          [
            "*"
          ]
        ]
      },
      "hp": 31,
      "ap": 4,
      "art": "art/revenant_trio.png",
      "passives": [
        {
          "id": "revenants_call",
          "name": "Revenant's Call",
          "trigger": "static",
          "text": "This unit may move over other units while moving. Moving onto an enemy unit's tile this way deals 4 damage to it. After doing this, move this unit to an empty tile surrounding it for free.",
          "effects": [
            {
              "type": "modifyMove",
              "target": "self",
              "moveOverUnits": "enemy",
              "relocateToEmptySurroundingTile": true,
              "onMoveOntoUnit": [
                {
                  "type": "damage",
                  "target": "otherUnitOnTile",
                  "amount": 4
                }
              ]
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "three_curses",
          "name": "Three Curses",
          "cost": 1,
          "text": "This attack deals an additional 1 damage for each time it has previously been used this turn. Deals 1 damage. Hits 3 times. Use up to three times per turn.",
          "range": [
            1,
            3
          ],
          "rangeText": "1-3",
          "target": "unit",
          "limits": {
            "maxPerTurn": 3
          },
          "effects": [
            {
              "type": "damage",
              "amount": 1,
              "hits": 3,
              "modifiers": [
                {
                  "addAmount": {
                    "perPreviousUseThisTurn": 1
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "forsaken_technique",
          "name": "Forsaken Technique",
          "cost": 1,
          "text": "Choose a 1AP attack from among the promoted cards. Use it as this ability for free, except it deals an additional damage on the first hit for each ability this unit has already used this turn. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": {
                "cost": 1,
                "kind": "attack"
              },
              "free": true,
              "addDamage": {
                "amount": {
                  "perAbilityUsedThisTurn": 1
                },
                "scope": "firstHit"
              }
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "western_wind_avatar",
      "set": "Hidden Avatars",
      "name": "Western Wind Avatar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": [
          [
            "Lancer"
          ],
          [
            "Nimbus"
          ]
        ]
      },
      "hp": 30,
      "ap": 4,
      "art": "art/western_wind_avatar.png",
      "passives": [
        {
          "id": "staggering_winds",
          "name": "Staggering Winds",
          "trigger": "static",
          "text": "The first melee attack against this unit each turn can only deal a maximum of 4 damage (total, for all hits).",
          "effects": [
            {
              "type": "capDamage",
              "target": "self",
              "max": 4,
              "from": "meleeAttack",
              "scope": "firstMeleeAttackEachTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "wind_javelins",
          "name": "Wind Javelins",
          "cost": 1,
          "text": "This attack deals 1 damage less for each time it was previously used this turn. Deals 7 damage.",
          "usesPath": true,
          "range": [
            1,
            4
          ],
          "rangeText": "1-4",
          "target": "tile",
          "targetText": "path to a tile, hits the first unit on it",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1,
              "area": "firstUnitOnPath",
              "modifiers": [
                {
                  "addAmount": {
                    "perPreviousUseThisTurn": -1
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "azure_hot_point",
          "name": "Azure-Hot Point",
          "cost": 1,
          "text": "Deals 6 damage. Deals an additional 2 damage if the target is in the direction this unit last moved this turn.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "modifiers": [
                {
                  "if": "target.inDirectionLastMoved",
                  "addAmount": 2
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "blue_flare_dragontrail",
          "name": "Blue Flare Dragontrail",
          "cost": 2,
          "text": "This unit moves 3-4 tiles (your choice), changing direction one or two times but never turning back the way it came. It may move over units this way, and moving onto an enemy unit scorches the tile that unit is on until the end of your opponent's next turn. This ability must leave this unit alone on its tile. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "min": 3,
                "max": 4
              },
              "path": {
                "directionChanges": [
                  1,
                  2
                ],
                "noReversal": true
              },
              "mayMoveOverUnits": true,
              "scorchTilesOfEnemiesMovedOver": true,
              "finalTileMustBeEmpty": true
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "crimson_dusk_avatar",
      "set": "Hidden Avatars",
      "name": "Crimson Dusk Avatar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": [
          [
            "Fighter"
          ],
          [
            "Flaming"
          ]
        ]
      },
      "hp": 34,
      "ap": 4,
      "art": "art/crimson_dusk_avatar.png",
      "passives": [
        {
          "id": "burning_trail",
          "name": "Burning Trail",
          "trigger": "self.firstMoveOnOwnTurn",
          "text": "The first time this unit moves each turn, it does not take damage from scorched tiles, and it may move an additional 2 tiles for free.",
          "effects": [
            {
              "type": "firstMoveScorchImmunity"
            },
            {
              "type": "move",
              "target": "self",
              "extraTiles": 2,
              "direction": "any",
              "free": true,
              "optional": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "slayer_fangs",
          "name": "Slayer Fangs",
          "cost": 1,
          "text": "Deals 5 damage. Hits twice. Use only once per turn.",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "swinging_smash",
          "name": "Swinging Smash",
          "cost": 1,
          "text": "Deals 7 damage. Use up to twice per turn.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "limits": {
            "maxPerTurn": 2
          },
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ]
        },
        {
          "id": "chain_lantern_combo",
          "name": "Chain-Lantern Combo",
          "cost": 2,
          "text": "Deals 3 damage to all units surrounding this one. Scorch each tile where a unit was dealt damage this way. Then, deals 6 damage to all units on the path.",
          "usesPath": true,
          "pathRule": "straight",
          "range": [
            1,
            3
          ],
          "rangeText": "3",
          "target": "tile",
          "targetText": "straight line",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "area": "allUnitsSurroundingSelf",
              "scorchHitTiles": true
            },
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "area": "allUnitsOnPath"
            }
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "endothermic_geo_vent_avatar",
      "set": "Hidden Avatars",
      "name": "Endothermic Geo-Vent Avatar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": [
          [
            "Alien"
          ],
          [
            "Frozen"
          ]
        ]
      },
      "hp": 32,
      "ap": 4,
      "art": "art/endothermic_geo_vent_avatar.png",
      "passives": [
        {
          "id": "esoteric_pathways",
          "name": "Esoteric Pathways",
          "trigger": "static",
          "text": "This unit can move into a board boundary if there is an empty tile on the opposite board boundary in the same row or column. Doing so moves it to that tile (without passing through any units in the way. Still pay the AP cost for this unit to move).",
          "effects": [
            {
              "type": "wrapAroundMove",
              "target": "self",
              "if": "oppositeBoundaryTileEmptyInSameRowOrColumn",
              "passesThroughUnits": false,
              "payMoveCost": true
            }
          ],
          "script": null
        }
      ],
      "abilities": [
        {
          "id": "irradiated_trident",
          "name": "Irradiated Trident",
          "cost": 1,
          "text": "Deals 2 damage. Hits 3 times. The first hit ignores armour. The first time this ability is used each turn, it deals an additional 1 damage on each hit.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 3,
              "firstHitBypassesArmour": true,
              "modifiers": [
                {
                  "if": "thisAbilityNotUsedEarlierThisTurn",
                  "addAmount": 1
                }
              ]
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "flash_freezing_drop",
          "name": "Flash-Freezing Drop",
          "cost": 2,
          "text": "Deals 6 damage plus an additional 4 damage for each card beneath the target unit (the cards it promoted or fused from, or cards that got there another way). If the target takes the next turn, it must spend an additional 1AP on its first action that turn. Use only once per turn.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "limits": {
            "oncePerTurn": true
          },
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "modifiers": [
                {
                  "addAmount": {
                    "perCardUnderTarget": 4
                  }
                }
              ]
            },
            {
              "type": "increaseActionCost",
              "target": "hitUnit",
              "amount": 1,
              "scope": "firstActionOfTurn"
            }
          ]
        },
        {
          "id": "siphoning_probosces",
          "name": "Siphoning Probosces",
          "cost": 3,
          "text": "Deals 12 damage. Armour up to the number of armour damaged this way.",
          "effects": [
            {
              "type": "damage",
              "amount": 12,
              "hits": 1
            },
            {
              "type": "armour",
              "target": "self",
              "upTo": "armourDamaged"
            }
          ],
          "tags": [
            "melee"
          ]
        }
      ],
      "classTags": []
    },
    {
      "id": "cruel_maelstrom_avatar",
      "set": "Hidden Avatars",
      "name": "Cruel Maelstrom Avatar",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "tribute",
        "count": 3,
        "requirement": [
          [
            "Mage"
          ],
          [
            "Lightning"
          ]
        ]
      },
      "hp": 28,
      "ap": 4,
      "art": "art/cruel_maelstrom_avatar.png",
      "passives": [
        {
          "id": "suffocation_draught",
          "name": "Suffocation Draught",
          "trigger": "enemyUnitStartsTurnSurroundingSelf",
          "text": "When an enemy unit starts its turn surrounding this unit, that unit cannot use 1AP abilities this turn.",
          "effects": [
            {
              "type": "cannotUseAbilities",
              "target": "thatUnit",
              "cost": 1,
              "duration": "thisTurn"
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "ride_the_gale",
          "name": "Ride the Gale",
          "cost": 1,
          "text": "Move this unit up to 3 tiles in a straight line for free, ignoring units in the way. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": {
                "max": 3
              },
              "straightLine": true,
              "free": true,
              "ignoreUnitsInWay": true,
              "finalTileMustBeEmpty": true
            }
          ]
        },
        {
          "id": "crackling_staff",
          "name": "Crackling Staff",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice. Use up to twice per turn.",
          "limits": {
            "maxPerTurn": 2
          },
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ],
          "tags": [
            "melee"
          ]
        },
        {
          "id": "arc_lightning",
          "name": "Arc Lightning",
          "cost": 2,
          "text": "Deals 6 damage, then choose another enemy unit surrounding the target. Repeat the ability with the chosen unit as the new target, except deal 1 damage less. This ability stops when it would deal no damage or have no new unit to choose. Each unit may take damage from this ability only once each turn.",
          "range": [
            1,
            2
          ],
          "rangeText": "1-2",
          "target": "unit",
          "isMultiStage": true,
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1,
              "chain": {
                "to": "enemyUnitSurroundingLastTarget",
                "decreaseBy": 1,
                "eachUnitOncePerTurn": true
              }
            }
          ]
        }
      ],
      "classTags": []
    }
  ]
};

// Tag every effect with where it comes from (passive / ability / react / universal action)
annotateEffectSources(initialCardsData);
