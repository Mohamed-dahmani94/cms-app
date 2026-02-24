import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Create a new workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Configuration
const configData = [
    ['Field', 'Value'],
    ['Nom de projet', 'Résidence Tizi Ouzou'],
    ['Description', 'Construction de 12 blocs (8×R+9 + 4×R+5)'],
    ['Lieu', 'Tizi Ouzou, Algérie'],
    ['Client', 'OPGI Tizi Ouzou'],
    ['Marché N°', '2025/OPGI/TZ/001'],
    ['Date Marché', '2025-01-15'],
    ['ODS N°', 'ODS/2025/001'],
    ['Date ODS', '2025-02-01'],
    ['Coût Estimé (Marché)', '500000000'],
    [],
    ['Partie 2: Configuration des Gabarits'],
    ['Gabarit', 'Nombre de Blocs', 'Blocs Concernés', "Nombre d'Étages", 'Type Appart.', 'Nombre par Étage', 'Total Logements'],
    ['R+9', '8', 'Bloc A-H', '10', 'F2', '2', '160'],
    ['R+9', '8', 'Bloc A-H', '10', 'F3', '4', '320'],
    ['R+9', '8', 'Bloc A-H', '10', 'F4', '2', '160'],
    ['R+5', '4', 'Bloc I-L', '6', 'F2', '3', '72'],
    ['R+5', '4', 'Bloc I-L', '6', 'F3', '3', '72'],
    ['R+5', '4', 'Bloc I-L', '6', 'Commerce', '2', '48']
];
const wsConfig = XLSX.utils.aoa_to_sheet(configData);
XLSX.utils.book_append_sheet(wb, wsConfig, 'Configuration');

// Sheet 2: Structure Marché Complète (tout regroupé)
const structureCompleteData = [
    // En-têtes
    ['LOT', 'Article', 'Désignation Article', 'Unité', 'Prix Unit. (DA)', 'Quantité', 'Montant Total', 'PV Requis',
        'Tâche', 'Sous-Tâche', 'Désignation Tâche', 'Durée (j)', 'Poids (%)', 'Priorité', 'Ingénieur',
        'Appliquer Blocs', 'Appliquer Étages', 'Offset (j)'],

    // LOT 01 - Terrassement
    ['LOT 01 - Terrassement', 'ART 01.01', 'Excavation générale', 'm³', '1500', '5000', '7500000', 'Non',
        'T01', 'ST01', 'Implantation', '2', '60', 'HIGH', 'topo@example.com',
        'ALL', '-', '0'],
    ['', '', '', '', '', '', '', '',
        'T01', 'ST02', 'Piquetage', '1', '40', 'HIGH', 'topo@example.com',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Excavation mécanique', '10', '70', 'HIGH', 'chef@example.com',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST02', 'Évacuation terres', '5', '30', 'MEDIUM', '',
        '', '', ''],

    ['LOT 01 - Terrassement', 'ART 01.02', 'Remblai compacté', 'm³', '800', '3000', '2400000', 'Oui',
        'T01', 'ST01', 'Préparation terrain', '3', '50', 'HIGH', '',
        'ALL', '-', '0'],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Compactage', '5', '50', 'HIGH', '',
        '', '', ''],

    // LOT 02 - Béton Armé
    ['LOT 02 - Béton Armé', 'ART 02.01', 'Fondations semelles', 'm³', '45000', '200', '9000000', 'Oui',
        'T01', 'ST01', 'Coffrage semelles', '8', '30', 'HIGH', '',
        'ALL', 'RDC', '0'],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Ferraillage semelles', '6', '40', 'HIGH', '',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T03', 'ST01', 'Coulage béton', '4', '30', 'HIGH', '',
        '', '', ''],

    ['LOT 02 - Béton Armé', 'ART 02.02', 'Poteaux BA', 'm³', '50000', '150', '7500000', 'Oui',
        'T01', 'ST01', 'Coffrage poteaux', '6', '30', 'HIGH', '',
        'ALL', 'ALL', '0'],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Ferraillage poteaux', '5', '40', 'HIGH', '',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T03', 'ST01', 'Coulage poteaux', '3', '30', 'HIGH', '',
        '', '', ''],

    ['LOT 02 - Béton Armé', 'ART 02.03', 'Poutres BA', 'm³', '48000', '180', '8640000', 'Oui',
        'T01', 'ST01', 'Coffrage poutres', '7', '35', 'HIGH', '',
        'ALL', 'ALL', '0'],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Ferraillage poutres', '6', '35', 'HIGH', '',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T03', 'ST01', 'Coulage poutres', '4', '30', 'HIGH', '',
        '', '', ''],

    // LOT 03 - Maçonnerie
    ['LOT 03 - Maçonnerie', 'ART 03.01', 'Murs extérieurs', 'm²', '3500', '8000', '28000000', 'Non',
        'T01', 'ST01', 'Montage murs', '15', '80', 'HIGH', '',
        'ALL', 'ALL', '0'],
    ['', '', '', '', '', '', '', '',
        'T01', 'ST02', 'Joints', '3', '20', 'MEDIUM', '',
        '', '', ''],

    ['LOT 03 - Maçonnerie', 'ART 03.02', 'Cloisons intérieures', 'm²', '2800', '6000', '16800000', 'Non',
        'T01', 'ST01', 'Montage cloisons', '12', '85', 'HIGH', '',
        'ALL', '1-9', '0'],
    ['', '', '', '', '', '', '', '',
        'T01', 'ST02', 'Finitions', '2', '15', 'MEDIUM', '',
        '', '', ''],

    // LOT 04 - Revêtement
    ['LOT 04 - Revêtement', 'ART 04.01', 'Carrelage sol', 'm²', '4500', '5000', '22500000', 'Non',
        'T01', 'ST01', 'Préparation surface', '2', '20', 'MEDIUM', '',
        'ALL', 'ALL', '0'],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Pose carrelage', '8', '60', 'HIGH', '',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T03', 'ST01', 'Joints finition', '2', '20', 'MEDIUM', '',
        '', '', ''],

    ['LOT 04 - Revêtement', 'ART 04.02', 'Peinture', 'm²', '1200', '12000', '14400000', 'Non',
        'T01', 'ST01', 'Préparation murs', '3', '25', 'MEDIUM', '',
        'ALL', 'ALL', '0'],
    ['', '', '', '', '', '', '', '',
        'T02', 'ST01', 'Première couche', '4', '35', 'HIGH', '',
        '', '', ''],
    ['', '', '', '', '', '', '', '',
        'T03', 'ST01', 'Deuxième couche', '4', '40', 'HIGH', '',
        '', '', '']
];

const wsStructureComplete = XLSX.utils.aoa_to_sheet(structureCompleteData);

// Ajuster la largeur des colonnes pour meilleure lisibilité
wsStructureComplete['!cols'] = [
    { wch: 25 }, // LOT
    { wch: 12 }, // Article
    { wch: 25 }, // Désignation Article
    { wch: 8 },  // Unité
    { wch: 12 }, // Prix Unit
    { wch: 10 }, // Quantité
    { wch: 15 }, // Montant Total
    { wch: 10 }, // PV Requis
    { wch: 8 },  // Tâche
    { wch: 12 }, // Sous-Tâche
    { wch: 25 }, // Désignation Tâche
    { wch: 10 }, // Durée
    { wch: 10 }, // Poids
    { wch: 10 }, // Priorité
    { wch: 20 }, // Ingénieur
    { wch: 15 }, // Appliquer Blocs
    { wch: 15 }, // Appliquer Étages
    { wch: 10 }  // Offset
];

XLSX.utils.book_append_sheet(wb, wsStructureComplete, 'Structure Marche');

// Write to file
XLSX.writeFile(wb, 'Template_Import_Marche.xlsx');
console.log('✅ Template Excel créé: Template_Import_Marche.xlsx');
console.log('📋 Format simplifié: 2 feuilles (Configuration + Structure Marché complète)');
