
-- Insert default expense categories
INSERT INTO categories (name, icon, type, user_id, is_default) VALUES
('Food & Dining', 'UtensilsCrossed', 'expense', '', TRUE),
('Transportation', 'Car', 'expense', '', TRUE),
('Shopping', 'ShoppingBag', 'expense', '', TRUE),
('Entertainment', 'Film', 'expense', '', TRUE),
('Bills & Utilities', 'Receipt', 'expense', '', TRUE),
('Healthcare', 'Heart', 'expense', '', TRUE),
('Travel', 'Plane', 'expense', '', TRUE),
('Education', 'GraduationCap', 'expense', '', TRUE),
('Personal Care', 'Sparkles', 'expense', '', TRUE),
('Other', 'MoreHorizontal', 'expense', '', TRUE);

-- Insert default income categories
INSERT INTO categories (name, icon, type, user_id, is_default) VALUES
('Salary', 'Briefcase', 'income', '', TRUE),
('Freelance', 'Laptop', 'income', '', TRUE),
('Investment', 'TrendingUp', 'income', '', TRUE),
('Business', 'Building', 'income', '', TRUE),
('Gift', 'Gift', 'income', '', TRUE),
('Other Income', 'DollarSign', 'income', '', TRUE);
