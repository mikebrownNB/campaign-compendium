-- ============================================
-- SEED DATA — Run after schema setup
-- ============================================

-- ===== THREADS =====
insert into threads (title, status, priority, tags, description) values
('The Umbral Fang — Imminent Threat', 'urgent', 'urgent', '{"faction","danger"}', 'Most consistently threatening faction. Absorbing Scarlet Razor territory. Skirrt warns they''ve been "unusually quiet." Parting words: "Look for the people that are looking for you." Vidorant defected to them.'),
('Gnexus vs. Darkpowders — Double Agent Dilemma', 'active', 'active', '{"quest","faction"}', 'Darkpowders want flaming skull fuel cells (1K/cell). Lt. Harthrand is the contact. Gnexus Agent Ballridge wants stolen clearance units recovered (1.5K each + 500 if operational). Both sides courting the party.'),
('Gnexus Thought Exchange Machine', 'active', 'active', '{"quest","danger"}', 'At the Gnexusversary, Thought Exchange Research Vessel unveiled — 9 alumni consciousnesses in crystals. Korvak confirmed trapped minds. Professor Godwick and Bleema-Bla-Bla behind it. Research base deep underground.'),
('The Xyraxian Ring — Cosmic MacGuffin', 'dormant', 'cosmic', '{"item","quest"}', 'Golden ring with white gem — destroys Xyraxis. In portable hole. Xyraxian Empire crates keep appearing. Princess Zendali''s rebellion fleet exists. Empire harvesting planetary cores — dying star.'),
('The Fungal Threat', 'active', 'active', '{"danger","quest"}', 'Slow-burn since session 1. Every impact site has central growth. Mushroom god killed but ground rumbled. Gnexus deployed flaming skull automata + draconic skeleton defense. Fungus broke apart planet and moon.'),
('The Maw — Crankshaft''s Calling', 'active', 'personal', '{"personal","danger"}', 'Slowly expanding. Autognomes are hive mind with symbiotic slime. Crankshaft compelled to throw things in — erases memories. Mushroom god targeted Crankshaft because it hates the Maw. Walls lined with columns and old buildings.'),
('St. Peter & The Golden Goblet', 'active', 'personal', '{"personal","item"}', 'At Temple of Celestian, St. Peter saw sextant/chalice/morning star through telescope — chalice spoke. Priests gave golden goblet with gems and ivory. Divine calling unfollowed.'),
('Prophecies Disappearing', 'dormant', 'mystery', '{"danger","personal"}', 'St. Peter''s déjà vu at Temple of Light faded. Crankshaft''s feeling about Piko vanished. Neither got fortune told — prophecies disappearing.');

-- ===== FACTIONS =====
insert into factions (name, status, description, tags) values
('The Umbral Fang', 'Hostile', 'Most dangerous criminal org on VP. Absorbing Scarlet Razor territory. Currently planning something big. 7,000gp bounty on Kai.', '{"danger"}'),
('The Darkpowder Syndicate', 'Complicated', 'Dwarven crime family out of Hammerstone. Varren Blackpowder runs backdoor ops. Lt. Harthrand wants flaming skull fuel cells (1K each). Believed behind Gnexus overgrowth attack. Prisoner 13 (daughter) was in Revel''s End.', '{"faction"}'),
('Hammerstone Parliament', 'Neutral', 'Dwarven clans that govern by yelling. Home to Blackpowder clan. Party has connections through Varren. Hammerstone Mining runs Fell Echo Mines.', '{"faction"}'),
('Gnexus Government', 'Employer', 'Gnomish city-state focused on magical research. Gerent Darling + Bleema-Bla-Bla. Agent Ballridge is intelligence. Alchemist Guild, Silver Thorn, Banking Alliance, Artificers.', '{"faction"}'),
('The Scarlet Razors', 'Weakened', 'Formerly powerful, now declining. Vidorant defected to Umbral Fang. Territory absorbed. Jimmy Wheels controls their shipyard.', '{"faction"}'),
('Xyraxian Empire', 'Hostile Empire', 'Dying empire harvesting planetary cores. Party deposed Prince Zenith, installed Princess Zendali. Rebellion fleet exists. Ring of destruction in party''s portable hole.', '{"danger"}'),
('Hunter''s Guild (Brawl)', 'Ally', 'Rock of Brawl. Hammondstock full member. Half-price ammo. Current lead: giant crow in volcanic cave.', '{"ally"}'),
('The Amethyst Argonauts', 'Unknown', 'Faction on VP. Limited info — not yet deeply engaged.', '{"faction"}');

-- ===== LOCATIONS =====
insert into locations (name, category, tags, description) values
('The Hub', 'Home Base', '{"location"}', 'Pirate town of misfits. The Shaft (Skirrt''s bar), obelisk job board, Phoenix Forge (drydock). PO Box watched by Timmy FastHands.'),
('Revel''s End', 'Dungeon', '{"location","danger"}', 'Stone prison north of Fell Echo Mines. ~50 guards (27 killed). Iron golem, elven wizard warden. Prisoners 13 and X.'),
('The Maw', 'Mystery', '{"mystery","danger"}', 'Crankshaft''s origin. Massive gooey pit, slowly expanding. Walls lined with columns. Throwing something in erases all memories of it.'),
('Hammerstone', 'City', '{"location"}', 'Dwarven capital with Parliament. Blackpowder clan, regulated weapon stores.'),
('Spuffalo Plains', 'Wilderness', '{"location"}', 'Flat grasslands. Kai''s centaur people. Two wrecked spelljammer cargo ships.'),
('Gnexus', 'City', '{"location"}', 'Gnomish city-state. Walking undead. Bog Gnorman''s, Stumbling Pixie, Vanderfell Bistro. Magical Research Corps underground.'),
('Rock of Brawl', 'City', '{"location"}', 'Major wildspace trade hub. Hunter''s Guild. 4 gangs: Othamatta, Maridon Sandyfoot, the Juggler. Starry Sigh riverboat.'),
('Xyraxian Citadel', 'Foreign', '{"location","danger"}', 'Butterfly-shaped landmass orbiting dying star. Early industrial weapons. Princess Zendali reclaimed throne.'),
('The Undergrowth', 'Dungeon', '{"location","danger","fungal"}', 'Fungal area near Gnexus. Troglodytes, basilisks, dragon Tatarmak. Stone quarry ruins. Mushroom god killed but ground rumbled.'),
('Temple of Celestian', 'Sacred', '{"location"}', 'Space temple with giant telescope. St. Peter received golden goblet. Attacked by reptilians and tentacle ship.'),
('Westmoreland', 'Settlement', '{"location"}', 'Travel waypoint. Druid encounters nearby.');

-- ===== NPCs =====
insert into npcs (name, role, faction, location, description, tags) values
('Skirrt', 'Broker', null, 'The Hub', 'Kenku. Info broker at The Shaft. Metal peg-leg. Charges 10gp. Spy network. Warning about Umbral Fang.', '{"npc"}'),
('Varren Blackpowder', 'Contact', 'Darkpowder', 'Hammerstone', 'Dwarf in noble clothing. Backdoor operations. Gave party first mission (Revel''s End).', '{"npc","faction"}'),
('Agent Constant Ballridge', 'Contact', 'Gnexus', 'The Hub', 'Gnome intelligence operative. Leather vest with stars. Sphere of non-detection. Wants stolen clearance units.', '{"npc","faction"}'),
('Lt. Harthrand Hammerhand', 'Contact', 'Darkpowder', 'The Hub', 'Darkpowder Lt. Weapons, troops, training. Fancy dwarven bar back room. Wants flaming skull fuel cells.', '{"npc","faction"}'),
('Bleema-Bla-Bla', 'Power Player', 'Gnexus', 'Gnexus', 'Founder of Gnexus. Runs Magical Research Corps. Introduced Thought Exchange Vessel.', '{"npc","faction"}'),
('Snake Eyed Jack', 'Wild Card', null, null, 'Freed from chained coffin on pirate ship. Boons: Dimension Door, Summon Aberration, or Blight. Now free.', '{"npc"}'),
('Timmy FastHands', 'Contact', null, 'The Hub', 'Young half-elf, burned, missing fingers. Watches party''s PO box.', '{"npc"}'),
('Tatarmak', 'Temporary Ally', null, 'The Undergrowth', 'Dragon from undergrowth. Temporary ally against corrupted dragon.', '{"npc"}'),
('Princess Zendali', 'Ally', 'Xyraxian Empire', 'Xyraxian Citadel', 'Golden-eyed elven princess. Party helped reclaim throne. Gave ring + portable hole. Commands rebellion fleet.', '{"npc","faction"}'),
('Oddwin', 'Merchant', null, 'The Hub', 'Magic item dealer. Go-to for appraisals and trade.', '{"npc"}'),
('Zodar', 'Crew', null, 'Wayward Wiggle', 'Key crew member aboard the Wayward Wiggle (9 crew total).', '{"npc","crew"}'),
('Immodele', 'Crew', null, 'Wayward Wiggle', 'Crew member of the Wayward Wiggle.', '{"npc","crew"}'),
('Magelore', 'Crew', null, 'Wayward Wiggle', 'Crew member of the Wayward Wiggle.', '{"npc","crew"}'),
('Selirus Rainmoon', 'Ally', null, null, 'Firbolg of the Storm Sworn. Rescued from fungal ruins (Session 3).', '{"npc"}'),
('Jimwald Collyswab', 'Contact', null, null, 'Xeno Termination Ltd. Party goals: eliminate Umbral Fang, kill ancient dragon.', '{"npc"}');

-- ===== LOOT ITEMS =====
insert into loot_items (name, details, source, holder) values
('Ring of Xyraxis', 'Golden ring, white gem. Destroys Xyraxis. In portable hole.', 'S7 — Zendali', null),
('Golden Goblet', 'Gems + ivory. Chalice spoke to St. Peter.', 'S15 — Temple', 'St. Peter'),
('Bloodshed Greatsword', 'Carnelian rune. Add CON to damage. Invoke: spend Hit Dice.', 'S12 — Trog Rider', null),
('Dragon Guard Armour', '+1 breastplate. Adv vs dragon breath.', 'S12 — Trog Rider', null),
('Belt of Hill Giant Strength', 'Won from dance-off.', 'S8 — Religious Ship', null),
('Horn of Blasting', 'Carved like a borthak.', 'S10 — Borthak Lair', null),
('Gauntlets of Eldritch Ferocity', 'Warlock attune. Treat 1s as 2s on Eldritch Blast.', 'S15 — Pirate Ship', null),
('Ring of Evasion', 'From vault heist rogue body.', 'S9 — Vault', null),
('Mask of Killer Rabbit', 'Adv Persuasion/Deception. 1/LR summon giant bunny.', 'S3 — Fungal Nexus', null),
('+1 Handaxe of Wounding', '1d4/wound/turn. Returning with Mask.', 'S3 — Fungal Nexus', null),
('Tentacular Grapple', 'Under altar at collapsed temple.', 'S14 — Collapsed Planet', null),
('Rod +2', 'From troll encounter.', 'S11 — Wormstraddle', null),
('Scroll of Sending', 'Contact Darkpowders re: flaming skulls.', 'S15 — Harthrand', null),
('Mortensor''s Book', 'Necromancy thesis. Longevity secrets.', 'S9 — Vault', null),
('Dagger of First Light', 'From Yuanti lair.', 'S13 — Fell Echo', null);

-- ===== SESSIONS =====
insert into sessions (number, title, real_date, ingame_date, summary) values
(3, 'Session 3', 'Sep 29-30, 2023', 'Springmas 15–17', 'Weapon restrictions. Fungal nexus / Grow Op. Maw auto-gnomes. Gnexus. Rabbit mask creature, Groffs, Box of Doom. Rescued Selirus Rainmoon. Mask of Killer Rabbit, +1 Handaxe, Orb of Direction, Folding Boat.'),
(7, 'Session 7', 'Jun 7-9, 2024', 'SpingTwas 15 – Summeruno 17', 'Doc recon. Skirrt on Maw. Ship christened "Wayward Wiggle." Travel to Xyraxis. Citadel: weapons, vampirate. Met Blastimoff + Zendali. Ring + portable hole. Gladiatorial victory. Pearlescent pepper.'),
(8, 'Session 8', 'Sep 6-8, 2024', 'Summeruno 22 – Summerdos 3', 'Xyraxis: trial by combat. Zendali empress. Dance-off → Belt of Hill Giant Strength. Hunter''s Guild. Prophecies disappearing.'),
(9, 'Session 9', 'Dec 6-8, 2024', 'Summerdos 8–14', 'Brawl downtime. Pirate map. Return to VP. Vidorant defected. Epic vault heist: skull, map, Ring of Evasion, 4K gold, more.'),
(10, 'Session 10', 'Feb 28-30, 2025', 'Summerdos 15–21', 'Heart peach fruit. Borthak hunt → Horn of Blasting. Mushroom god targeted Crankshaft. Meepo → ochre jelly. Poison boon. Ground rumbled.'),
(11, 'Session 11', 'Apr 25-27, 2025', 'Summerdos 22–28', 'Gnexus agriculture minister. Stumbling Pixie (My Chemical Gnomance). Wormstraddle Ranch. Trolls, Rod +2. Crankshaft vision. Serpentine creature.'),
(12, 'Session 12', 'Jun 28, 2025', 'Fallujuan 1–7', 'Undergrowth deep dive. Crankshaft petrified! Dragon Tatarmak. Bloodshed Greatsword + Dragon Guard Armour. 7K from Gnexus. Skirrt: 10K bounty on Kai.'),
(13, 'Session 13', 'Sep 6, 2025', 'Fallujuan 14–28', 'Fell Echo Mines — Yuanti + hydra. Dagger of First Light. Maw memory loss. Gnexusversary: Thought Exchange Machine. Skirrt: Umbral Fang "unusually quiet."'),
(14, 'Session 14', 'Nov 29, 2025', 'Fallimall 1–10', 'Umbral Fang ambush. Map delivered (3K). Collapsed planet temple — fungus, demons, Tentacular Grapple. Thieves guild. Jimwald Collyswab.'),
(15, 'Session 15', 'Jan 24, 2026', 'Fallimall ~15–20', 'Temple of Celestian — golden goblet. Pirate ambush — Snake Eyed Jack freed. Sold ship (10K). Skirrt warning. Harthrand + Ballridge meetings. Bonharvestnacht coming.');

-- ===== CALENDAR EVENTS (sample — the full set from spreadsheet) =====
insert into calendar_events (month, day, title, type, session, description) values
(0,1,'Campaign Begin','quest','1-2','Campaign begins on Volitaire Petrius.'),
(0,2,'Prison (Revel''s End)','quest','1-2','Revel''s End prison mission. Darkpowder key retrieval.'),
(0,3,'Swamp','combat','1-2','Swamp encounter on return.'),
(0,6,'Heist Day 1','quest','1-2','First heist operation.'),
(0,7,'Heist Day 2','quest','1-2','Heist conclusion.'),
(0,15,'Day 1 + Interest','quest','3','Session 3. Weapon shop restrictions.'),
(0,16,'Meet Firbolg','social','3','Met Selirus Rainmoon in fungal area.'),
(0,17,'Mid-Jungle Start','combat','3','Fungal forest. Rabbit mask, Groffs, Box of Doom. Major loot.'),
(1,6,'Ship Order','quest','5-6','Ship order placed.'),
(1,13,'Skirrt + Prof','faction','5-6','Met Skirrt. Professor arrives.'),
(1,14,'★ Solstice','festival','5-6','Solstice celebration.'),
(1,15,'Plant Wiggleroot','quest','7','Planted Wiggleroot in ship.'),
(1,19,'Ship Christened!','quest','7','Wayward Wiggle christened. First fruit.'),
(2,6,'Debark — Xyraxis','travel','7','Arrived at Xyraxian Citadel.'),
(2,22,'Deep Xyraxis','quest','8','Met Zendali + Blastimoff. Ring + portable hole.'),
(2,25,'Leave Xyraxis','travel','8','Trial by combat won. Zendali empress.'),
(3,1,'Arrive Brawl','travel','8','Rock of Brawl. Dance-off → Belt of Hill Giant Strength.'),
(3,10,'Home — VP','travel','9','Returned to VP.'),
(3,14,'★ Vault Heist','quest','9','Epic Scarlet Razor vault heist.'),
(3,20,'Borthak Hunt','combat','10','Hunted Borthak alpha. Horn of Blasting.'),
(3,21,'Mushroom God','combat','10','Mushroom god battle. Poison boon. Ground rumbled.'),
(3,23,'Overgrowth Start','quest','11','Gnexus expedition.'),
(4,2,'Under Day 1','combat','12','Deep caves. Quarry, Grick Wurms.'),
(4,4,'Under Day 3','combat','12','Met Tatarmak. Bloodshed Greatsword + Dragon Guard Armour.'),
(4,5,'Gnexus 7K','loot','12','Gnexus paid 7,000gp.'),
(4,7,'Hub — 10K Bounty','faction','12','Skirrt: Kai has 10K bounty.'),
(4,15,'Mine → Maw','quest','13','Yuanti cleared. Maw memory loss.'),
(4,21,'★ Graduation','festival','13','Gnexus graduation.'),
(4,28,'★ Gnexusversary','festival','13','Thought Exchange Machine unveiled.'),
(5,3,'Umbral Fang Ambush','combat','14','Ambushed. Killed them all. Two new members.'),
(5,8,'Collapsed Planet','quest','14','Temple ruins. Fungus, demons. Tentacular Grapple.'),
(5,15,'Temple of Celestian','quest','15','Reptilians, moonbeam. Golden goblet.'),
(5,17,'Pirate Ambush','combat','15','Starry Sigh. Snake Eyed Jack freed.'),
(5,19,'Return to Hub','faction','15','Sold ship (10K). Skirrt warning.'),
(5,20,'Darkpowder & Gnexus','faction','15','Double agent dilemma.'),
(5,28,'★ Bonharvestnacht','festival','15+','Festival on Fallimall 28!');
