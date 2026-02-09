import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shirt, Layers, Ruler, Briefcase, Scissors,
  Dumbbell, Waves, ShoppingBag, Trash2, History, Users, Wallet,
  Plus, X, Check, Settings, Zap, HelpCircle, ExternalLink, LogOut, User,
  Crown, Star, Heart, Sparkles, Gem, Gift, Tag, Minus, Sun, Moon, Info,
  Umbrella, CloudRain, Snowflake, Ghost, Coffee, Camera, Watch, Glasses,
  Backpack, Palette, Trophy, Flame, Smile, MoveVertical,
  Laptop, Smartphone, Headphones, Bike, Car, Home, Key, Book, Music,
  Baby, Dog, Cat, Plane, Hammer, Wrench, Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { CATEGORIES, PRICE_LEVELS, CONDITIONS, RELEVANCE_LEVELS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useBackground } from '@/App';
import api from '@/lib/api';

// Default brand examples for price levels
const DEFAULT_BRAND_EXAMPLES = {
  luxus: ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Hermès'],
  teuer: ['Hugo Boss', 'Tommy Hilfiger', 'Ralph Lauren', 'Calvin Klein', 'Lacoste'],
  mittel: ['Zara', 'H&M Premium', 'Mango', 'COS', 'Massimo Dutti'],
  guenstig: ['H&M', 'Primark', 'C&A', 'Takko', 'KiK']
};

// Icon mapping
const iconMap = {
  // Tops
  'Shirts': Shirt,
  'Top': Sun,
  'Hemd': User,
  'Bluse': Sparkles,
  'Hoodie': Ghost,
  'Sweatshirt': Smile,
  'Strickmode/Cardigans': Layers,
  'Kleider': Gem,

  // Bottoms
  'Hosen': Ruler,
  'Jeans': Zap,
  'Shorts': Scissors,
  'Röcke/Jupe': Scissors, // Using Scissors (tailoring) as fallback for skirt

  // Outerwear
  'Jacken': Umbrella,
  'Mäntel': CloudRain,
  'Blazer': Briefcase,

  // Special
  'Sportbekleidung': Dumbbell,
  'Bademode': Waves,

  // Generic Fallbacks
  Shirt, Layers, Ruler, Briefcase, Scissors, Dumbbell, Waves,
  Crown, Star, Heart, Sparkles, Gem, Gift, Tag, ShoppingBag,
  Umbrella, CloudRain, Snowflake, Ghost, Coffee, Watch, Glasses,
  Backpack, Palette, Trophy, Flame, Smile, MoveVertical,
  Laptop, Smartphone, Headphones, Bike, Car, Home, Key, Book, Music,
  Baby, Dog, Cat, Plane, Hammer, Wrench, Utensils
};

// Helper for dynamic lookup
const getIcon = (iconName) => {
  // If iconName matches a key in iconMap, return it
  if (iconMap[iconName]) return iconMap[iconName];

  // Handle case where category name matches key directly
  return iconMap[iconName] || Shirt;
};

// Default colors for all elements
const DEFAULT_COLORS = {
  // Price levels
  luxus: '#FEF3C7',
  teuer: '#DBEAFE',
  mittel: '#D1FAE5',
  guenstig: '#F1F5F9',
  // Conditions
  neu: '#D1FAE5',
  kaum_benutzt: '#E0F2FE',
  gebraucht: '#FED7AA',
  abgenutzt: '#FECACA',
  // Relevance
  stark_relevant: '#DDD6FE',
  wichtig: '#CFFAFE',
  nicht_beliebt: '#F3F4F6'
};

export default function MainPage() {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useBackground();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dialogStep, setDialogStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedRelevance, setSelectedRelevance] = useState(null);
  const [price, setPrice] = useState('');
  const [fixedPrice, setFixedPrice] = useState(null);
  const [todayStats, setTodayStats] = useState({ total_purchases: 0, total_amount: 0, total_items: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [colors, setColors] = useState(DEFAULT_COLORS);

  // Credit customer states
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [categoryIcons, setCategoryIcons] = useState({});
  const [hiddenCategories, setHiddenCategories] = useState([]);

  const [brandExamples, setBrandExamples] = useState(DEFAULT_BRAND_EXAMPLES);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Parallelize independent API calls (react-best-practices: async-parallel)
    Promise.all([
      loadTodayStats(),
      loadCustomCategories(),
      loadSettings()
    ]);
  }, []);

  const loadTodayStats = async () => {
    try {
      const stats = await api.getTodayStats();
      setTodayStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadCustomCategories = async () => {
    try {
      const cats = await api.getCustomCategories();
      // cats is now array of {name, image} objects
      setCustomCategories(cats);
    } catch (error) {
      console.error('Failed to load custom categories:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings?.colors) {
        setColors({ ...DEFAULT_COLORS, ...settings.colors });
      }
      if (settings?.category_icons) {
        setCategoryIcons(settings.category_icons);
      }
      if (settings?.hidden_categories) {
        setHiddenCategories(settings.hidden_categories);
      }
      if (settings?.darkMode !== undefined) {
        setDarkMode(settings.darkMode);
      }
      if (settings?.brand_examples) {
        setBrandExamples({ ...DEFAULT_BRAND_EXAMPLES, ...settings.brand_examples });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Toggle dark/light mode
  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    try {
      const currentSettings = await api.getSettings();
      await api.updateSettings({ ...currentSettings, darkMode: newMode });
    } catch (error) {
      console.error('Failed to save dark mode:', error);
    }
  };
  // Combine default and custom categories, filter out hidden ones
  // Memoized to prevent recalculation on every render (react-best-practices: rerender-memo)
  const allCategories = useMemo(() => [
    ...CATEGORIES.filter(cat => !hiddenCategories.includes(cat.name)),
    ...customCategories.map(cat => ({
      id: cat.name.toLowerCase().replace(/\s+/g, '_'),
      name: cat.name,
      icon: cat.icon || categoryIcons[cat.name] || 'Shirt',
      image: cat.image || null
    }))
  ], [hiddenCategories, customCategories, categoryIcons]);

  // Find longest category name for button width
  const longestCategoryName = allCategories.reduce((longest, cat) =>
    cat.name.length > longest.length ? cat.name : longest, ''
  );

  const openCategoryDialog = (category) => {
    setSelectedCategory(category);
    setDialogStep(1);
    setSelectedLevel(null);
    setSelectedCondition(null);
    setSelectedRelevance(null);
    setPrice('');
    setFixedPrice(null);
  };

  const closeDialog = () => {
    setSelectedCategory(null);
    setDialogStep(1);
    setSelectedLevel(null);
    setSelectedCondition(null);
    setSelectedRelevance(null);
    setPrice('');
    setFixedPrice(null);
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setDialogStep(2);
  };

  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setDialogStep(3);
  };

  const handleRelevanceSelect = async (relevance) => {
    setSelectedRelevance(relevance);
    setDialogStep(4); // Immediate transition
    setIsCheckingPrice(true);

    try {
      const result = await api.lookupFixedPrice(
        selectedCategory.name,
        selectedLevel.name,
        selectedCondition.name,
        relevance.name
      );

      if (result.found && result.fixed_price !== null) {
        setFixedPrice(result.fixed_price);
        setPrice(result.fixed_price.toString());
      } else {
        setFixedPrice(null);
        setPrice('');
      }
    } catch (error) {
      console.error('Failed to lookup price:', error);
      setFixedPrice(null);
    } finally {
      setIsCheckingPrice(false);
    }
  };

  const handleChangeBackground = async (bgId) => {
    // Removed - using dark mode instead
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Abgemeldet');
  };

  const handleOpenGoogleLens = () => {
    // Open Google Image Search in a new tab (Google Lens is blocked in some environments)
    window.open('https://www.google.com/imghp?hl=de', '_blank');
    toast.info('Google Bildersuche geöffnet - komm zurück wenn du das Preisniveau weisst!');
  };

  const handleAddToCart = () => {
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error('Bitte einen gültigen Preis eingeben');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      category: selectedCategory.name,
      price_level: selectedLevel.name,
      condition: selectedCondition.name,
      relevance: selectedRelevance.name,
      price: priceValue,
      isFixedPrice: fixedPrice !== null
    };

    setCart([...cart, newItem]);
    toast.success(`${selectedCategory.name} hinzugefügt`);
    closeDialog();
  };

  const handleQuickAdd = () => {
    if (fixedPrice === null) return;

    const newItem = {
      id: Date.now().toString(),
      category: selectedCategory.name,
      price_level: selectedLevel.name,
      condition: selectedCondition.name,
      relevance: selectedRelevance.name,
      price: fixedPrice,
      isFixedPrice: true
    };

    setCart([...cart, newItem]);
    toast.success(`${selectedCategory.name} hinzugefügt (Fixpreis)`);
    closeDialog();
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setCreditEnabled(false);
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  // Search customers for credit mode
  const searchCustomers = async (search) => {
    setCustomerSearch(search);
    if (search.length < 2) {
      setCustomerResults([]);
      return;
    }

    try {
      setIsSearchingCustomers(true);
      const results = await api.getCustomers(search);
      setCustomerResults(results);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Warenkorb ist leer');
      return;
    }

    // Validate credit mode
    if (creditEnabled && !selectedCustomer) {
      toast.error('Bitte wähle einen Kunden für die Gutschrift');
      return;
    }

    setIsSubmitting(true);
    try {
      const items = cart.map(item => ({
        category: item.category,
        price_level: item.price_level,
        condition: item.condition,
        relevance: item.relevance,
        price: item.price,
      }));

      // Use credit-enabled purchase if customer selected
      const purchase = creditEnabled && selectedCustomer
        ? await api.createPurchaseWithCredit(items, selectedCustomer.id, user?.username)
        : await api.createPurchase(items);

      if (creditEnabled && selectedCustomer) {
        toast.success(`${cartTotal.toFixed(2)} CHF auf Konto von ${selectedCustomer.first_name} ${selectedCustomer.last_name} gutgeschrieben!`);
      } else {
        toast.success('Ankauf gespeichert!');
      }

      setCart([]);
      setCreditEnabled(false);
      setSelectedCustomer(null);
      setCustomerSearch('');
      loadTodayStats();
      setIsMobileCartOpen(false);

      setTimeout(() => {
        window.open(`/receipt/${purchase.id}`, '_blank');
      }, 100);
    } catch (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get color for any element
  const getColor = (key) => {
    return colors[key] || DEFAULT_COLORS[key] || '#F1F5F9';
  };

  // Cart sidebar content
  const CartContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Warenkorb
        </h2>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-destructive hover:text-destructive"
            data-testid="clear-cart-btn"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Leeren
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Artikel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item, index) => (
              <div
                key={item.id}
                className="cart-item bg-muted/50 rounded-lg p-3 flex justify-between items-start"
                data-testid={`cart-item-${index}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm flex items-center gap-1">
                    {item.category}
                    {item.isFixedPrice && (
                      <Zap className="w-3 h-3 text-amber-500" title="Fixpreis" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.price_level} • {item.condition}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.relevance}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">
                    CHF {item.price.toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFromCart(item.id)}
                    data-testid={`remove-item-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display text-3xl font-bold" data-testid="cart-total">
            CHF {cartTotal.toFixed(2)}
          </span>
        </div>

        {/* Credit Toggle */}
        {cart.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => {
                setCreditEnabled(!creditEnabled);
                if (creditEnabled) {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Wallet className={`w-5 h-5 ${creditEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${creditEnabled ? 'text-green-600' : ''}`}>
                  Gutschrift auf Kundenkonto
                </span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors ${creditEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${creditEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {/* Customer Selection */}
            {creditEnabled && (
              <div className="mt-3 space-y-2">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-2 bg-green-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-green-700" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-green-800">
                          {selectedCustomer.first_name} {selectedCustomer.last_name}
                        </p>
                        <p className="text-xs text-green-600">
                          Guthaben: {selectedCustomer.current_balance?.toFixed(2) || '0.00'} CHF
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Kunde suchen..."
                      value={customerSearch}
                      onChange={(e) => searchCustomers(e.target.value)}
                      className="h-9 text-sm"
                    />
                    {isSearchingCustomers && (
                      <p className="text-xs text-muted-foreground">Suchen...</p>
                    )}
                    {customerResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {customerResults.slice(0, 5).map(c => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearch('');
                              setCustomerResults([]);
                            }}
                          >
                            <span className="text-sm">{c.first_name} {c.last_name}</span>
                            <span className="text-xs text-muted-foreground">{c.current_balance?.toFixed(2)} CHF</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {customerSearch.length >= 2 && customerResults.length === 0 && !isSearchingCustomers && (
                      <div className="text-center py-2">
                        <p className="text-xs text-muted-foreground">Kein Kunde gefunden</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs h-6 p-0"
                          onClick={() => navigate('/customers')}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Neuen Kunden erstellen
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          className={`w-full h-14 text-lg touch-btn ${creditEnabled && selectedCustomer ? 'bg-green-600 hover:bg-green-700' : ''}`}
          disabled={cart.length === 0 || isSubmitting || (creditEnabled && !selectedCustomer)}
          onClick={handleCheckout}
          data-testid="checkout-btn"
        >
          {isSubmitting ? (
            'Speichern...'
          ) : creditEnabled && selectedCustomer ? (
            <>
              <Wallet className="w-5 h-5 mr-2" />
              Gutschrift erstellen
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Ankauf abschliessen
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" data-testid="main-page">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 no-print">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-primary truncate">ReWear POS</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden xs:block">Ankaufs-System</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Heute</p>
                <p className="font-display font-bold text-lg" data-testid="today-amount">
                  CHF {todayStats.total_amount.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Ankäufe</p>
                <p className="font-display font-bold text-lg" data-testid="today-purchases">
                  {todayStats.total_purchases}
                </p>
              </div>
            </div>

            {/* Dark/Light Mode Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="hidden sm:flex"
              onClick={toggleDarkMode}
              data-testid="dark-mode-btn"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Link to="/settings">
              <Button variant="outline" size="sm" data-testid="settings-link" className="px-2 sm:px-3">
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Einstellungen</span>
              </Button>
            </Link>

            <Link to="/history">
              <Button variant="outline" size="sm" data-testid="history-link" className="px-2 sm:px-3">
                <History className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Historie</span>
              </Button>
            </Link>

            <Link to="/customers">
              <Button variant="outline" size="sm" data-testid="customers-link" className="px-2 sm:px-3">
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Kunden</span>
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="user-menu-btn" className="px-2 sm:px-3">
                  <User className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Rolle: {user?.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden relative" data-testid="mobile-cart-btn">
                  <ShoppingBag className="w-4 h-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96">
                <SheetHeader>
                  <SheetTitle className="sr-only">Warenkorb</SheetTitle>
                </SheetHeader>
                <CartContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-4 lg:gap-8">
          <main className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-muted-foreground">Kategorie wählen</h2>
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {allCategories.map((category) => {
                const Icon = getIcon(category.icon);
                return (
                  <Card
                    key={category.id}
                    className="category-card p-2 sm:p-4 cursor-pointer flex flex-col items-center justify-center min-h-[90px] sm:min-h-[120px] hover:bg-accent/50"
                    onClick={() => openCategoryDialog(category)}
                    data-testid={`category-${category.id}`}
                  >
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-8 h-8 sm:w-12 sm:h-12 mb-1 sm:mb-2 rounded-lg object-cover"
                      />
                    ) : (
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-primary" strokeWidth={1.5} />
                    )}
                    <span className="text-xs sm:text-sm font-medium text-center leading-tight">{category.name}</span>
                  </Card>
                );
              })}
            </div>
          </main>

          <aside className="hidden lg:block w-80 xl:w-96">
            <div className="sticky top-24 bg-white rounded-xl p-6 sidebar-shadow min-h-[500px]">
              <CartContent />
            </div>
          </aside>
        </div>
      </div>

      {/* Add item dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategory && (
                <>
                  {(() => {
                    const Icon = getIcon(selectedCategory.icon);
                    return <Icon className="w-5 h-5" />;
                  })()}
                  {selectedCategory?.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Step 1: Price Level */}
            {dialogStep === 1 && (
              <div className="space-y-3 animate-slide-up">
                <p className="text-sm text-muted-foreground mb-4">Preisniveau wählen</p>
                <TooltipProvider delayDuration={200}>
                  {PRICE_LEVELS.map((level) => (
                    <div key={level.id} className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-14 justify-start text-left level-btn border-2"
                        style={{ backgroundColor: getColor(level.id), borderColor: getColor(level.id) }}
                        onClick={() => handleLevelSelect(level)}
                        data-testid={`level-${level.id}`}
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{level.name}</p>
                          <p className="text-xs text-gray-600">{level.description}</p>
                        </div>
                      </Button>

                      {/* Brand Examples Tooltip */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <p className="font-semibold mb-1">{level.name} - Beispiele:</p>
                          <ul className="text-sm">
                            {(brandExamples[level.id] || []).map((brand, i) => (
                              <li key={i}>• {brand}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </TooltipProvider>

                {/* Unsicher Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 justify-center border-dashed border-2 text-muted-foreground hover:text-primary"
                  onClick={handleOpenGoogleLens}
                  data-testid="unsicher-btn"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Unsicher? Google Bildersuche
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Condition */}
            {dialogStep === 2 && (
              <div className="space-y-3 animate-slide-up">
                <p className="text-sm text-muted-foreground mb-4">Zustand wählen</p>
                <div className="grid grid-cols-2 gap-3">
                  {CONDITIONS.map((condition) => (
                    <Button
                      key={condition.id}
                      variant="outline"
                      className="h-16 border-2 font-medium text-sm px-2 whitespace-normal leading-tight"
                      style={{ backgroundColor: getColor(condition.id), borderColor: getColor(condition.id) }}
                      onClick={() => handleConditionSelect(condition)}
                      data-testid={`condition-${condition.id}`}
                    >
                      {condition.name}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => setDialogStep(1)}
                >
                  Zurück
                </Button>
              </div>
            )}

            {/* Step 3: Relevance */}
            {dialogStep === 3 && (
              <div className="space-y-3 animate-slide-up">
                <p className="text-sm text-muted-foreground mb-4">Relevanz wählen</p>
                {RELEVANCE_LEVELS.map((relevance) => (
                  <Button
                    key={relevance.id}
                    variant="outline"
                    className="w-full h-14 justify-start text-left level-btn border-2"
                    style={{ backgroundColor: getColor(relevance.id), borderColor: getColor(relevance.id) }}
                    onClick={() => handleRelevanceSelect(relevance)}
                    data-testid={`relevance-${relevance.id}`}
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{relevance.name}</p>
                      <p className="text-xs text-gray-600">{relevance.description}</p>
                    </div>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => setDialogStep(2)}
                >
                  Zurück
                </Button>
              </div>
            )}

            {/* Step 4: Price */}
            {dialogStep === 4 && (
              <div className="space-y-6 animate-slide-up">
                {isCheckingPrice ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Preis wird gesucht...
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedLevel?.name} • {selectedCondition?.name} • {selectedRelevance?.name}
                      </p>

                      {fixedPrice !== null ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-amber-800 mb-2 flex items-center justify-center gap-1">
                            <Zap className="w-4 h-4" />
                            Fixpreis gefunden
                          </p>
                          <p className="font-display text-4xl font-bold text-amber-900">
                            CHF {fixedPrice.toFixed(2)}
                          </p>
                          <Button
                            className="mt-4 w-full h-12 bg-amber-600 hover:bg-amber-700"
                            onClick={handleQuickAdd}
                            data-testid="quick-add-btn"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Sofort hinzufügen
                          </Button>
                          <p className="text-xs text-amber-700 mt-3">
                            Oder anderen Preis wählen:
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-4">
                          Preis mit Slider oder Buttons wählen:
                        </p>
                      )}

                      {/* Price Display */}
                      <div className="font-display text-5xl font-bold mb-4" data-testid="price-display">
                        CHF {(parseFloat(price) || 0).toFixed(2)}
                      </div>

                      {/* Vertical Price Slider with +/- buttons */}
                      <div className="flex items-center justify-center gap-6 mb-4">
                        {/* Minus buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => setPrice(Math.max(0, (parseFloat(price) || 0) - 5).toString())}
                            data-testid="price-minus-5"
                          >
                            -5
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-14 w-14 rounded-full"
                            onClick={() => setPrice(Math.max(0, (parseFloat(price) || 0) - 1).toString())}
                            data-testid="price-minus-1"
                          >
                            <Minus className="w-6 h-6" />
                          </Button>
                        </div>

                        {/* Vertical Slider - optimized for 0-30 range */}
                        <div className="flex flex-col items-center h-48">
                          <span className="text-xs text-muted-foreground mb-2">30</span>
                          <div className="relative h-full w-12 flex items-center justify-center">
                            <Slider
                              value={[Math.min(parseFloat(price) || 0, 30)]}
                              onValueChange={(val) => setPrice(val[0].toString())}
                              min={0}
                              max={30}
                              step={0.5}
                              orientation="vertical"
                              className="h-full"
                              data-testid="price-slider"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground mt-2">0</span>
                        </div>

                        {/* Plus buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => setPrice(((parseFloat(price) || 0) + 5).toString())}
                            data-testid="price-plus-5"
                          >
                            +5
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-14 w-14 rounded-full"
                            onClick={() => setPrice(((parseFloat(price) || 0) + 1).toString())}
                            data-testid="price-plus-1"
                          >
                            <Plus className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Quick price buttons - common amounts */}
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {[1, 2, 3, 5, 8, 10, 12, 15, 20, 25].map((val) => (
                        <Button
                          key={val}
                          variant={parseFloat(price) === val ? "default" : "outline"}
                          className="h-11 font-display font-bold"
                          onClick={() => setPrice(val.toString())}
                          data-testid={`quick-price-${val}`}
                        >
                          {val}
                        </Button>
                      ))}
                    </div>

                    {/* Manual input for larger amounts */}
                    <div className="flex items-center gap-2 mb-4 px-4">
                      <span className="text-sm text-muted-foreground">Höherer Betrag:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">CHF</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-20 h-9 px-2 border rounded-md text-center font-display font-bold"
                          placeholder="0.00"
                          min="0"
                          step="0.5"
                          data-testid="price-manual-input"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => setDialogStep(3)}
                      >
                        Zurück
                      </Button>
                      <Button
                        className="flex-1 h-12"
                        onClick={handleAddToCart}
                        disabled={!price || parseFloat(price) <= 0}
                        data-testid="add-to-cart-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Hinzufügen
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
