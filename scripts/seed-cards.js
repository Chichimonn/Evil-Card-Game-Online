import fs from 'fs';
import path from 'path';

// Load or write the cards.json provided by the user
const cardsJsonContent = `{
  "schemaVersion": 1,
  "universalActions": [
    {
      "id": "draw",
      "name": "Draw",
      "cost": 1,
      "limits": {
        "oncePerTurn": true
      },
      "text": "Draw 1 card.",
      "effects": [
        {
          "type": "draw",
          "amount": 1
        }
      ]
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
      ]
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
          ]
        }
      ],
      "abilities": []
    }
  ],
  "cards": [
    {
      "id": "sentinel_knight",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "guards_strike",
          "name": "Guard's Strike",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["inspiring"],
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
          ]
        }
      ]
    },
    {
      "id": "topaz_mage",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "twinbolt",
          "name": "Twinbolt",
          "cost": 1,
          "range": [1, 3],
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
          "range": [1, 2],
          "target": "unit",
          "text": "Deals 10 damage. If the target took the last turn, your opponent cannot choose it to take their next turn unless it is their last non-Wall unit (they must choose a different non-Wall unit if able).",
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
              "exception": "targetIsLastNonWallUnit"
            }
          ],
          "rangeText": "2"
        }
      ]
    },
    {
      "id": "duelist_fighter",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "ready_stance",
          "name": "Ready Stance",
          "cost": 1,
          "tags": ["inspiring"],
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
            }
          ]
        },
        {
          "id": "rapid_thrust",
          "name": "Rapid Thrust",
          "cost": 1,
          "tags": ["melee"],
          "text": "Deals 3 damage. Hits twice.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 2
            }
          ]
        }
      ]
    },
    {
      "id": "shade_assassin",
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
          ]
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
          "rangeText": "1-3",
          "targetText": "empty tile target"
        },
        {
          "id": "plunge_and_twist",
          "name": "Plunge and Twist",
          "cost": 1,
          "tags": ["melee"],
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
      ]
    },
    {
      "id": "archivist_sage",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "deep_research",
          "name": "Deep Research",
          "cost": 1,
          "tags": ["assist"],
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
          ]
        },
        {
          "id": "quarterstaff_slam",
          "name": "Quarterstaff Slam",
          "cost": 2,
          "tags": ["melee"],
          "text": "Deals 7 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 7,
              "hits": 1
            }
          ]
        }
      ]
    },
    {
      "id": "powder_keg_plunderer",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "fuse_lighter",
          "name": "Fuse Lighter",
          "cost": 1,
          "tags": ["melee"],
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
      ]
    },
    {
      "id": "combat_cook",
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
          ]
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
          "tags": ["melee", "assist"],
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
      ]
    },
    {
      "id": "battle_engineer",
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
          "tags": ["inspiring"],
          "text": "If you have no Obstructing Wall token in play, create one on an empty surrounding tile (it is a token with 12HP, 0AP, and no abilities).",
          "effects": [
            {
              "type": "createToken",
              "token": "obstructing_wall",
              "tile": "chosenEmptySurrounding",
              "if": "noFriendlyToken:obstructing_wall"
            }
          ]
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
      ]
    },
    {
      "id": "conflict_correspondent",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "field_notes",
          "name": "Field Notes",
          "cost": 1,
          "tags": ["assist"],
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
          ]
        },
        {
          "id": "broaden_search",
          "name": "Broaden Search",
          "cost": 1,
          "tags": ["assist"],
          "range": [1, 2],
          "target": "friendlyUnit",
          "limits": {
            "oncePerTurn": true
          },
          "text": "Target a friendly unit. This turn, that unit's attacks gain an additional 1 range. Use only once per turn.",
          "effects": [
            {
              "type": "modifyRange",
              "target": "target",
              "amount": 1,
              "appliesTo": "attacks",
              "duration": "thisTurn"
            }
          ],
          "rangeText": "1-2"
        }
      ]
    },
    {
      "id": "happy_camper",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "pitch_camp",
          "name": "Pitch Camp",
          "cost": 1,
          "tags": ["inspiring"],
          "text": "If you have no Raging Bonfire token in play, create one on an empty surrounding tile (It is a token with 12HP, 0AP, and Passive- Blazing Fixture).",
          "effects": [
            {
              "type": "createToken",
              "token": "raging_bonfire",
              "tile": "chosenEmptySurrounding",
              "if": "noFriendlyToken:raging_bonfire"
            }
          ]
        },
        {
          "id": "red_hot_skewer",
          "name": "Red-Hot Skewer",
          "cost": 1,
          "tags": ["melee"],
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
          ]
        }
      ]
    },
    {
      "id": "imbued_knight",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "overhead_slam",
          "name": "Overhead Slam",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["melee"],
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
          "id": "fortress_stance",
          "name": "Fortress Stance",
          "cost": 1,
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
          ]
        }
      ]
    },
    {
      "id": "polearm_knight",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "bludgeon",
          "name": "Bludgeon",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["inspiring", "melee"],
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
          ]
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
      ]
    },
    {
      "id": "greatsword_knight",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "greatcleave",
          "name": "Greatcleave",
          "cost": 1,
          "tags": ["inspiring", "melee"],
          "target": "surroundingEnemyUnits",
          "targetCount": "any",
          "text": "Deals 5 damage. For each target, this attack deals an additional 1 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 1,
              "modifiers": [
                {
                  "addAmount": {
                    "perTarget": 1
                  }
                }
              ]
            }
          ],
          "targetText": "target any number of surrounding enemy units"
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
      ]
    },
    {
      "id": "longbow_knight",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "stave_off",
          "name": "Stave Off",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["assist"],
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
      ]
    },
    {
      "id": "bastion_knight",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "shove_off",
          "name": "Shove Off",
          "cost": 1,
          "tags": ["melee"],
          "text": "Deals 2 damage. Knockback 1. If this unit has already used this attack on the target this turn, deals an additional 4 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 2,
              "hits": 1,
              "modifiers": [
                {
                  "if": "thisAbilityUsedOnTargetEarlierThisTurn",
                  "addAmount": 4
                }
              ]
            },
            {
              "type": "knockback",
              "target": "hitUnit",
              "distance": 1
            }
          ]
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
      ]
    },
    {
      "id": "euclase_mage",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "glacial_spikes",
          "name": "Glacial Spikes",
          "cost": [1, 2],
          "tags": ["straightLine"],
          "range": [1, 3],
          "rangeText": "3",
          "text": "Deals 5 damage per AP spent to all enemy units along the path.",
          "effects": [
            {
              "type": "damage",
              "amount": { "perAP": 5 },
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
          ]
        }
      ]
    },
    {
      "id": "garnet_mage",
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
          ]
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
          ]
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
      ]
    },
    {
      "id": "opal_mage",
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
          ]
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
          "tags": ["assist"],
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
              "amount": { "perEnemyHit": 1 }
            }
          ],
          "targetText": "targets tile"
        }
      ]
    },
    {
      "id": "dravite_mage",
      "name": "Dravite Mage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 13,
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "stone_wall",
          "name": "Stone Wall",
          "cost": 1,
          "tags": ["assist"],
          "range": [1, 2],
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
          "targetText": "empty tile target"
        },
        {
          "id": "boulder_hurl",
          "name": "Boulder Hurl",
          "cost": [1, 2],
          "range": [1, 2],
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
              "amount": { "perAP": 1 }
            }
          ]
        }
      ]
    },
    {
      "id": "amethyst_mage",
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
          ]
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
      ]
    },
    {
      "id": "halberd_fighter",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "cleave_and_tear",
          "name": "Cleave and Tear",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["inspiring", "melee"],
          "text": "Deals 5 damage. This unit may move up to 2 tiles before declaring this attack, ignoring other units as long as the final tile is unoccupied. Moving through an enemy unit in this way deals 5 damage to that unit.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": { "max": 2 },
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
          ]
        }
      ]
    },
    {
      "id": "spear_fighter",
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
          "text": "The first time this unit moves on its turn, it may move an additional tile in the same direction.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "extraTiles": 1,
              "direction": "same",
              "optional": true
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "deft_skewer",
          "name": "Deft Skewer",
          "cost": 1,
          "tags": ["melee"],
          "text": "Deals 4 damage. Then, this unit may armour up to 3. If not, this attack hits again for 3 damage. (Armour up only if there is a target).",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 1
            },
            {
              "type": "armour",
              "id": "armourChoice",
              "target": "self",
              "upTo": 3,
              "optional": true
            },
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "asAdditionalHit": true,
              "if": "armourChoice.declined"
            }
          ]
        }
      ]
    },
    {
      "id": "crossbow_fighter",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "jab_and_backstep",
          "name": "Jab and Backstep",
          "cost": 1,
          "tags": ["melee"],
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
          ]
        },
        {
          "id": "weighty_shot",
          "name": "Weighty Shot",
          "cost": 1,
          "tags": ["assist"],
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
      ]
    },
    {
      "id": "dual_sword_fighter",
      "name": "Dual-Sword Fighter",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 18,
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
              "amount": { "perHit": 1 }
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "dual_spin",
          "name": "Dual Spin",
          "cost": 1,
          "tags": ["melee"],
          "text": "Deals 3 damage. Then, hits again for 2 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 3,
              "hits": 1,
              "extraHit": { "amount": 2 }
            }
          ]
        },
        {
          "id": "frenzied_flurry",
          "name": "Frenzied Flurry",
          "cost": 2,
          "tags": ["melee"],
          "text": "Deals 5 damage. Hits 3 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 5,
              "hits": 3
            }
          ]
        }
      ]
    },
    {
      "id": "brawl_fighter",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "reckless_blow",
          "name": "Reckless Blow",
          "cost": 1,
          "tags": ["melee"],
          "text": "Deals 7 damage. Then, this unit takes 1 damage.",
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
          ]
        },
        {
          "id": "gut_shot",
          "name": "Gut Shot",
          "cost": 1,
          "tags": ["melee"],
          "text": "Deals 6 damage.",
          "effects": [
            {
              "type": "damage",
              "amount": 6,
              "hits": 1
            }
          ]
        }
      ]
    },
    {
      "id": "cutthroat_assassin",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "do_em_up",
          "name": "Do 'Em Up",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["melee"],
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
          ]
        }
      ]
    },
    {
      "id": "poisonblade_assassin",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "coated_edge",
          "name": "Coated Edge",
          "cost": 1,
          "tags": ["melee"],
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
          "tags": ["melee"],
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
      ]
    },
    {
      "id": "blood_sage",
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
          ]
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
              "amount": { "perDamageDealt": 1 }
            }
          ]
        }
      ]
    },
    {
      "id": "fateweaver_sage",
      "name": "Fateweaver Sage",
      "type": "unit",
      "basic": true,
      "reinforce": {
        "mode": "basic"
      },
      "hp": 16,
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "realm_warp",
          "name": "Realm Warp",
          "cost": 1,
          "tags": ["inspiring"],
          "range": [1, 3],
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
          "targetText": "empty tile target"
        },
        {
          "id": "withered_cane",
          "name": "Withered Cane",
          "cost": 1,
          "tags": ["melee"],
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
    },
    {
      "id": "swashbuckle_plunderer",
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "cutlass_slash",
          "name": "Cutlass Slash",
          "cost": 1,
          "tags": ["melee"],
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
      ]
    },
    {
      "id": "twinaxe_plunderer",
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
          ]
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
          "tags": ["melee"],
          "text": "Deals 4 damage. Hits 2 times.",
          "effects": [
            {
              "type": "damage",
              "amount": 4,
              "hits": 2
            }
          ]
        }
      ]
    },
    {
      "id": "daring_cavalier",
      "name": "Daring Cavalier",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Knight"]]
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
              "filter": { "cost": 1, "kind": "attack" },
              "free": true,
              "addDamage": { "amount": 1, "scope": "firstHit" }
            },
            { "type": "armour", "target": "self", "upTo": 2 }
          ]
        },
        {
          "id": "mounted_charge",
          "name": "Mounted Charge",
          "cost": 2,
          "text": "This unit moves 3 tiles, changing direction exactly once but not turning back the way it came. It may move over units, and doing so deals 8 damage to each of those units. This ability must leave this unit alone on its tile.",
          "effects": [
            {
              "type": "move",
              "target": "self",
              "distance": 3,
              "path": { "directionChanges": 1, "noReversal": true },
              "mayMoveOverUnits": true,
              "damageToUnitsMovedOver": 8,
              "finalTileMustBeEmpty": true
            }
          ],
          "tags": ["inspiring"]
        }
      ]
    },
    {
      "id": "orders_chosen",
      "name": "Order's Chosen",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Knight"]]
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "gird_for_battle",
          "name": "Gird for Battle",
          "cost": 1,
          "text": "Armour up to 6. Until the end of your opponent's next turn, reflect the next ranged attack that targets this unit.",
          "effects": [
            { "type": "armour", "target": "self", "upTo": 6 },
            {
              "type": "setReact",
              "duration": "untilEndOfOpponentNextTurn",
              "once": true,
              "trigger": "self.targetedByRangedAttack",
              "effects": [{ "type": "reflect" }]
            }
          ]
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
              "filter": { "cost": 1, "kind": "attack" },
              "free": true
            },
            {
              "type": "armour",
              "target": "self",
              "amount": 2,
              "if": "noShieldOfBlessingsBonusDealt"
            }
          ]
        }
      ]
    },
    {
      "id": "hardened_peacekeeper",
      "name": "Hardened Peacekeeper",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Knight"]]
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
              "target": "enemyUnitsSurroundingSelf",
              "amount": 1,
              "if": "target.startedTurnSurroundingSelf"
            }
          ]
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
              "filter": { "cost": 1, "kind": "attack" },
              "free": true
            },
            { "type": "armour", "target": "self", "amount": 1 }
          ]
        },
        {
          "id": "battered_shield",
          "name": "Battered Shield",
          "cost": 2,
          "text": "Armour up to 7. Surrounding friendly units may use this unit's armour as their own until the end of your opponent's next turn.",
          "effects": [
            { "type": "armour", "target": "self", "upTo": 7 },
            {
              "type": "shareArmour",
              "units": "friendlyUnitsSurroundingSelf",
              "duration": "untilEndOfOpponentNextTurn"
            }
          ],
          "tags": ["inspiring"]
        }
      ]
    },
    {
      "id": "vanguard_commander",
      "name": "Vanguard Commander",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Knight"]]
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "tactical_swap",
          "name": "Tactical Swap",
          "cost": 1,
          "text": "Swap positions with the target unit.",
          "effects": [
            { "type": "swapPositions", "units": ["self", "target"] }
          ],
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
              "filter": { "cost": 1, "kind": "attack" },
              "free": true
            }
          ]
        },
        {
          "id": "shield_bash_and_cleave",
          "name": "Shield Bash & Cleave",
          "cost": 2,
          "text": "Removes up to 2 armour from target unit. Deals 7 damage. Then, hits again dealing 4 damage to the target and all enemy units surrounding it.",
          "effects": [
            { "type": "removeArmour", "target": "target", "amount": 2, "upTo": true },
            { "type": "damage", "amount": 7, "hits": 1 },
            {
              "type": "damage",
              "amount": 4,
              "hits": 1,
              "asAdditionalHit": true,
              "area": "targetAndEnemyUnitsSurroundingTarget"
            }
          ],
          "tags": ["melee"]
        }
      ]
    },
    {
      "id": "nexus_sorcerer",
      "name": "Nexus Sorcerer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Mage"]]
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
          "text": "Use a 1AP attack on the promoted card as this ability for free, except it deals an additional 2 damage on the first hit.",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCard",
              "filter": { "cost": 1, "kind": "attack" },
              "free": true,
              "addDamage": { "amount": 2, "scope": "firstHit" }
            }
          ]
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
              "filter": { "cost": 2, "kind": "attack" },
              "free": true,
              "asAP": 2
            }
          ],
          "limits": { "oncePerTurn": true }
        },
        {
          "id": "nexus_displacement",
          "name": "Nexus Displacement",
          "cost": 3,
          "text": "Each target swaps tile position with the other (ignoring units in the way).",
          "effects": [
            {
              "type": "swapPositions",
              "units": ["target1", "target2"],
              "ignoreUnitsInWay": true
            }
          ],
          "tags": ["inspiring"],
          "target": "otherFriendlyUnitAndEnemyUnit",
          "targetText": "targets 1 other friendly unit and 1 enemy unit",
          "range": [1, 3],
          "rangeText": "1-3"
        }
      ]
    },
    {
      "id": "catalyst_curator",
      "name": "Catalyst Curator",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Mage"]]
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
          ]
        }
      ],
      "abilities": [
        {
          "id": "magic_missile",
          "name": "Magic Missile",
          "cost": 1,
          "text": "Deals 5 damage. Use only once per turn.",
          "effects": [{ "type": "damage", "amount": 5, "hits": 1 }],
          "target": "unit",
          "limits": { "oncePerTurn": true },
          "range": [1, 9],
          "rangeText": "9"
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
              "filter": { "cost": 1, "kind": "attack" },
              "free": true,
              "times": 2,
              "sameTarget": true
            },
            {
              "type": "lockAbility",
              "target": "self",
              "ability": "overload_gemstone",
              "duration": "yourNextTurn"
            }
          ],
          "limits": { "oncePerTurn": true }
        },
        {
          "id": "quartz_ray",
          "name": "Quartz Ray",
          "cost": 2,
          "text": "Deals 12 damage.",
          "effects": [
            { "type": "damage", "amount": 12, "hits": 1, "area": "allUnitsInLine" }
          ],
          "tags": ["inspiring"],
          "target": "direction",
          "targetText": "Choose a direction. Hits all units in a line"
        }
      ]
    },
    {
      "id": "barbarian_tyrant",
      "name": "Barbarian Tyrant",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Fighter"]]
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
              "filter": { "cost": 1, "kind": "attack", "melee": true },
              "free": true,
              "bypassArmourUpTo": 4
            }
          ]
        },
        {
          "id": "whirlwind_execution",
          "name": "Whirlwind Execution",
          "cost": 2,
          "text": "Deals 12 damage.",
          "effects": [
            { "type": "damage", "amount": 12, "hits": 1, "area": "allUnitsSurroundingSelf" }
          ],
          "targetText": "Hits all surrounding units"
        }
      ]
    },
    {
      "id": "wielder_of_night",
      "name": "Wielder of Night",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "promote",
        "requirement": [["Assassin"]]
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
            { "type": "cannotBeTargeted", "by": "reactEffects", "target": "self" }
          ]
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
              "filter": { "cost": 1, "kind": "attack", "melee": true },
              "free": true,
              "addDamage": { "amount": 3, "scope": "firstHit", "if": "selfOnTileBehindTarget" }
            }
          ]
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
            { "type": "endTurn", "target": "self" }
          ],
          "tags": ["inspiring"],
          "target": "emptyTile",
          "range": [1, 2],
          "rangeText": "2"
        }
      ]
    },
    {
      "id": "giant_boar",
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
              "addDamage": { "amount": 1, "scope": "allHits" },
              "knockbackOnLastHit": 1
            }
          ]
        }
      ],
      "abilities": [
        {
          "id": "goring_tusks",
          "name": "Goring Tusks",
          "cost": 1,
          "text": "Deals 4 damage. Hits twice.",
          "effects": [{ "type": "damage", "amount": 4, "hits": 2 }],
          "tags": ["melee"]
        },
        {
          "id": "cloven_crash",
          "name": "Cloven Crash",
          "cost": 2,
          "text": "Use this ability only if this unit has moved this turn. Deals 8 damage. Hits twice. The second hit may target a different unit.",
          "effects": [
            { "type": "damage", "amount": 8, "hits": 2, "secondHitMayTargetDifferentUnit": true }
          ],
          "tags": ["melee"],
          "requires": "self.movedThisTurn"
        }
      ]
    },
    {
      "id": "gateway_guardians",
      "name": "Gateway Guardians",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [["Knight"]]
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
            { "type": "immune", "to": "knockback", "target": "self", "duration": "untilEndOfTurn" },
            { "type": "cannotInflictKnockback", "target": "self", "duration": "yourNextTurn" }
          ],
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
              "filter": { "cost": 1, "kind": "attack", "melee": true },
              "free": true,
              "optionalKnockback": 1
            }
          ],
          "tags": ["melee"]
        },
        {
          "id": "fortified_blows",
          "name": "Fortified Blows",
          "cost": 2,
          "text": "Deals damage equal to this unit's armour. Hits twice.",
          "effects": [
            { "type": "damage", "amount": { "formula": "self.armour" }, "hits": 2 }
          ],
          "tags": ["inspiring", "melee"]
        },
        {
          "id": "guardian_stance",
          "name": "Guardian Stance",
          "cost": 1,
          "text": "Armour up to 6.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 6 }]
        }
      ]
    },
    {
      "id": "blade_singer",
      "name": "Blade Singer",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 2,
        "requirement": [["Mage", "Fighter"]]
      },
      "hp": 23,
      "ap": 3,
      "art": "art/blade_singer.png",
      "passives": [
        {
          "id": "wheel_of_blades",
          "name": "Wheel of Blades",
          "trigger": "turnStart",
          "text": "At the start of each player's turn, armour up to 4.",
          "effects": [{ "type": "armour", "target": "self", "upTo": 4 }]
        }
      ],
      "abilities": [
        {
          "id": "floating_weapon",
          "name": "Floating Weapon",
          "cost": 1,
          "text": "Use a 1AP melee attack from among the promoted cards as this ability for free, except its range is still this ability's range (it is not longer melee).",
          "effects": [
            {
              "type": "useAbility",
              "source": "promotedCards",
              "filter": { "cost": 1, "kind": "attack", "melee": true },
              "free": true,
              "rangeOverride": [1, 2],
              "noLongerMelee": true
            }
          ],
          "target": "unit",
          "range": [1, 2],
          "rangeText": "1-2"
        },
        {
          "id": "steel_cyclone",
          "name": "Steel Cyclone",
          "cost": [2, 3],
          "text": "Deals 2 damage. Hits 4 times per AP spent.",
          "effects": [
            { "type": "damage", "amount": 2, "hits": { "perAP": 4 }, "area": "allUnitsInPath" }
          ],
          "target": "tile",
          "targetText": "targets tile, hits all in path",
          "range": [1, 2],
          "rangeText": "2"
        }
      ]
    },
    {
      "id": "the_cyclotron",
      "name": "The Cyclotron",
      "type": "unit",
      "basic": false,
      "reinforce": {
        "mode": "fusion",
        "count": 3,
        "requirement": [["Cook", "Engineer", "Camper", "Correspondent"]]
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
            { "type": "immune", "to": "nonDamageEffects", "target": "self", "unless": "self.tookDamageThisTurn" }
          ]
        }
      ],
      "abilities": [
        {
          "id": "coin_plink",
          "name": "Coin Plink",
          "cost": 1,
          "text": "Deals 2 damage. If this attack kills the target, target another enemy unit within Range 1-4. Use this ability again against that unit, ignoring its AP cost (each time this happens counts as a another ability). Use only once per turn.",
          "effects": [
            { "type": "damage", "amount": 2, "hits": 1 },
            {
              "type": "repeatAbility",
              "if": "targetKilled",
              "newTarget": "anotherEnemyWithinRange:1-4",
              "ignoreCost": true,
              "countsAsAdditionalAbility": true
            }
          ],
          "tags": ["assist"],
          "target": "unit",
          "limits": { "oncePerTurn": true },
          "range": [1, 4],
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
              "filter": { "cost": 1 },
              "free": true,
              "distinctPerTurn": true
            }
          ]
        },
        {
          "id": "fatal_error",
          "name": "Fatal Error!",
          "cost": 0,
          "text": "Deals 77 damage. Use this ability only as this unit's 7th ability in a turn (move and draw are universal actions, not abilities).",
          "effects": [{ "type": "damage", "amount": 77, "hits": 1 }],
          "tags": ["melee"],
          "requires": "thisIsNthAbilityOfTurn:7,excludingUniversalActions"
        }
      ]
    }
  ]
}`;

// Write public/cards.json
fs.writeFileSync(path.resolve('public/cards.json'), cardsJsonContent);
// Also in root
fs.writeFileSync(path.resolve('cards.json'), cardsJsonContent);

// Write src/data/cardsData.ts
fs.writeFileSync(
  path.resolve('src/data/cardsData.ts'),
  `import { CardsDataSchema } from '../types/card';\n\nexport const initialCardsData: CardsDataSchema = ${cardsJsonContent};\n`
);

console.log('Successfully seeded cards.json and cardsData.ts');
