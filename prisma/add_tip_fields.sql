-- Add tip-related fields to ActiveCart
ALTER TABLE ActiveCart ADD COLUMN showTipPrompt BOOLEAN DEFAULT false;
ALTER TABLE ActiveCart ADD COLUMN tipAmount DECIMAL DEFAULT 0;
ALTER TABLE ActiveCart ADD COLUMN tipType TEXT DEFAULT 'PERCENT';
ALTER TABLE ActiveCart ADD COLUMN tipSuggestions TEXT DEFAULT '[15,20,25]';

-- Add tipType to FranchiseSettings
ALTER TABLE FranchiseSettings ADD COLUMN tipType TEXT DEFAULT 'PERCENT';
