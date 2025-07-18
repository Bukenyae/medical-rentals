// Inspection checklist templates for different property inspection types

export type ChecklistItem = {
  id: string;
  category: string;
  item: string;
  description?: string;
  completed: boolean;
  notes?: string;
};

export type InspectionChecklist = {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
};

// Generate a unique ID for checklist items
const generateId = () => Math.random().toString(36).substring(2, 11);

// Standard checklist items by category
const standardItems: Record<string, { item: string; description?: string }[]> = {
  'Exterior': [
    { item: 'Building exterior', description: 'Check for damage, peeling paint, or other issues' },
    { item: 'Walkways and driveway', description: 'Check for cracks, weeds, or trip hazards' },
    { item: 'Landscaping', description: 'Check lawn, plants, and irrigation systems' },
    { item: 'Exterior lighting', description: 'Verify all lights are working properly' },
    { item: 'Mailbox', description: 'Check condition and functionality' },
    { item: 'Garbage/recycling area', description: 'Ensure clean and functional' },
  ],
  'Entry': [
    { item: 'Front door', description: 'Check condition, locks, and weather stripping' },
    { item: 'Door bell/knocker', description: 'Test functionality' },
    { item: 'Entry flooring', description: 'Check for damage or wear' },
    { item: 'Entry lighting', description: 'Verify all lights are working properly' },
    { item: 'Security system', description: 'Test functionality if applicable' },
  ],
  'Living Areas': [
    { item: 'Flooring', description: 'Check for damage, stains, or wear' },
    { item: 'Walls and ceilings', description: 'Check for damage, marks, or water stains' },
    { item: 'Windows', description: 'Check operation, locks, screens, and blinds/curtains' },
    { item: 'Lighting', description: 'Test all lights and ceiling fans' },
    { item: 'Furniture', description: 'Check condition and cleanliness' },
    { item: 'Electronics', description: 'Test TV, internet, and other electronics' },
    { item: 'HVAC', description: 'Check thermostat and air flow from vents' },
  ],
  'Kitchen': [
    { item: 'Appliances', description: 'Test refrigerator, stove, oven, microwave, dishwasher' },
    { item: 'Sink and faucet', description: 'Check for leaks and proper drainage' },
    { item: 'Countertops', description: 'Check condition and cleanliness' },
    { item: 'Cabinets and drawers', description: 'Check operation and condition' },
    { item: 'Lighting', description: 'Test all lights' },
    { item: 'Garbage disposal', description: 'Test operation' },
    { item: 'Inventory', description: 'Check dishes, utensils, cookware, and small appliances' },
  ],
  'Bathrooms': [
    { item: 'Toilet', description: 'Check for leaks and proper flushing' },
    { item: 'Sink and faucet', description: 'Check for leaks and proper drainage' },
    { item: 'Shower/tub', description: 'Check for leaks, drainage, and water pressure' },
    { item: 'Exhaust fan', description: 'Test operation' },
    { item: 'Lighting', description: 'Test all lights' },
    { item: 'Towel bars and hooks', description: 'Check security and condition' },
    { item: 'Inventory', description: 'Check towels, bath mats, and toiletries' },
  ],
  'Bedrooms': [
    { item: 'Beds and bedding', description: 'Check condition and cleanliness' },
    { item: 'Furniture', description: 'Check condition of dressers, nightstands, etc.' },
    { item: 'Closets', description: 'Check doors, rods, shelves, and hangers' },
    { item: 'Windows', description: 'Check operation, locks, screens, and blinds/curtains' },
    { item: 'Lighting', description: 'Test all lights and ceiling fans' },
  ],
  'Laundry': [
    { item: 'Washer', description: 'Check for leaks and proper operation' },
    { item: 'Dryer', description: 'Check for proper operation and clean lint trap' },
    { item: 'Sink and faucet', description: 'Check for leaks and proper drainage if applicable' },
    { item: 'Lighting', description: 'Test all lights' },
    { item: 'Inventory', description: 'Check laundry supplies' },
  ],
  'Safety': [
    { item: 'Smoke detectors', description: 'Test operation and check batteries' },
    { item: 'Carbon monoxide detectors', description: 'Test operation and check batteries' },
    { item: 'Fire extinguisher', description: 'Check expiration date and pressure gauge' },
    { item: 'First aid kit', description: 'Check contents and expiration dates' },
    { item: 'Emergency information', description: 'Verify emergency contact information is available' },
    { item: 'Electrical panel', description: 'Ensure access is clear and breakers are labeled' },
  ],
};

// Additional items for specific inspection types
const additionalItems: Record<string, Record<string, { item: string; description?: string }[]>> = {
  'pre-booking': {
    'Guest Readiness': [
      { item: 'Welcome book', description: 'Verify information is current and complete' },
      { item: 'WiFi information', description: 'Verify network name and password are correct' },
      { item: 'Local recommendations', description: 'Check that restaurant and activity info is current' },
      { item: 'Check-in instructions', description: 'Verify accuracy and completeness' },
      { item: 'Guest amenities', description: 'Check coffee, tea, snacks, and welcome items' },
    ],
  },
  'post-booking': {
    'Damage Assessment': [
      { item: 'Furniture condition', description: 'Check for new damage or stains' },
      { item: 'Wall and floor condition', description: 'Check for new damage or marks' },
      { item: 'Appliance condition', description: 'Check for damage or improper use' },
      { item: 'Missing items', description: 'Check inventory for missing items' },
      { item: 'Unauthorized guests', description: 'Check for evidence of more than allowed guests' },
    ],
  },
  'maintenance-followup': {
    'Repair Verification': [
      { item: 'Completed repairs', description: 'Verify repairs were completed properly' },
      { item: 'Functionality', description: 'Test repaired items for proper operation' },
      { item: 'Cleanup', description: 'Verify area is clean after repairs' },
      { item: 'Documentation', description: 'Update maintenance records' },
      { item: 'Follow-up needs', description: 'Identify any additional repairs needed' },
    ],
  },
};

// Generate a checklist based on inspection type
export function generateInspectionChecklist(
  inspectionType: 'routine' | 'pre-booking' | 'post-booking' | 'maintenance-followup',
  propertyName: string
): InspectionChecklist {
  const titles = {
    'routine': `Routine Inspection - ${propertyName}`,
    'pre-booking': `Pre-booking Inspection - ${propertyName}`,
    'post-booking': `Post-booking Inspection - ${propertyName}`,
    'maintenance-followup': `Maintenance Follow-up - ${propertyName}`,
  };
  
  const descriptions = {
    'routine': 'Regular property inspection to identify maintenance needs and ensure property condition',
    'pre-booking': 'Inspection to ensure property is ready for guest arrival',
    'post-booking': 'Inspection after guest checkout to assess condition and identify any issues',
    'maintenance-followup': 'Inspection to verify completed maintenance work',
  };
  
  // Start with standard items
  let items: ChecklistItem[] = [];
  
  // Add standard items for all inspection types
  Object.entries(standardItems).forEach(([category, categoryItems]) => {
    categoryItems.forEach(item => {
      items.push({
        id: generateId(),
        category,
        item: item.item,
        description: item.description,
        completed: false,
        notes: '',
      });
    });
  });
  
  // Add additional items specific to the inspection type
  if (additionalItems[inspectionType]) {
    Object.entries(additionalItems[inspectionType]).forEach(([category, categoryItems]) => {
      categoryItems.forEach(item => {
        items.push({
          id: generateId(),
          category,
          item: item.item,
          description: item.description,
          completed: false,
          notes: '',
        });
      });
    });
  }
  
  return {
    id: generateId(),
    title: titles[inspectionType],
    description: descriptions[inspectionType],
    items,
  };
}

// Generate a cleaning checklist
export function generateCleaningChecklist(propertyName: string): InspectionChecklist {
  const cleaningItems: Record<string, { item: string; description?: string }[]> = {
    'General': [
      { item: 'Dust all surfaces', description: 'Including shelves, furniture, and decor' },
      { item: 'Vacuum all floors', description: 'Including under furniture and in corners' },
      { item: 'Mop hard floors', description: 'Use appropriate cleaner for floor type' },
      { item: 'Clean windows and mirrors', description: 'Remove streaks and fingerprints' },
      { item: 'Empty all trash', description: 'Replace trash bags in all bins' },
      { item: 'Check for lost items', description: 'Look under beds, in drawers, etc.' },
    ],
    'Kitchen': [
      { item: 'Clean appliances', description: 'Inside and outside, including microwave' },
      { item: 'Clean countertops and backsplash', description: 'Remove all stains and spills' },
      { item: 'Clean sink and faucet', description: 'Remove water spots and stains' },
      { item: 'Clean inside cabinets', description: 'If visibly dirty or at quarterly deep clean' },
      { item: 'Restock supplies', description: 'Dish soap, paper towels, etc.' },
    ],
    'Bathrooms': [
      { item: 'Clean toilet', description: 'Inside, outside, and around base' },
      { item: 'Clean shower/tub', description: 'Remove soap scum and water spots' },
      { item: 'Clean sink and counter', description: 'Remove water spots and toothpaste' },
      { item: 'Clean mirror', description: 'Remove streaks and spots' },
      { item: 'Restock supplies', description: 'Toilet paper, soap, shampoo, etc.' },
    ],
    'Bedrooms': [
      { item: 'Change all linens', description: 'Sheets, pillowcases, and duvet covers' },
      { item: 'Make beds', description: 'According to property standards' },
      { item: 'Dust furniture', description: 'Including headboards and nightstands' },
      { item: 'Check under beds', description: 'Clean and check for lost items' },
    ],
    'Exterior': [
      { item: 'Sweep entry and porch', description: 'Remove debris and cobwebs' },
      { item: 'Clean outdoor furniture', description: 'If applicable' },
      { item: 'Check garbage area', description: 'Ensure bins are empty and clean' },
    ],
  };
  
  let items: ChecklistItem[] = [];
  
  // Add cleaning items
  Object.entries(cleaningItems).forEach(([category, categoryItems]) => {
    categoryItems.forEach(item => {
      items.push({
        id: generateId(),
        category,
        item: item.item,
        description: item.description,
        completed: false,
        notes: '',
      });
    });
  });
  
  return {
    id: generateId(),
    title: `Cleaning Checklist - ${propertyName}`,
    description: 'Comprehensive cleaning checklist for property turnover',
    items,
  };
}

// Save a completed checklist
export function saveCompletedChecklist(checklist: InspectionChecklist): string {
  // In a real implementation, this would save to a database
  // For now, we'll just return a formatted string
  
  const completedItems = checklist.items.filter(item => item.completed).length;
  const totalItems = checklist.items.length;
  const completionDate = new Date().toISOString().split('T')[0];
  
  return `
# ${checklist.title}
Completed on: ${completionDate}
Completion rate: ${completedItems}/${totalItems} (${Math.round((completedItems / totalItems) * 100)}%)

## Summary
${checklist.description}

## Checklist Items
${checklist.items.map(item => `
### ${item.category}: ${item.item}
- Status: ${item.completed ? '✅ Completed' : '❌ Not Completed'}
${item.notes ? `- Notes: ${item.notes}` : ''}
`).join('')}
  `;
}