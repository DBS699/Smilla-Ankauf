import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shirt, Layers, Ruler, Briefcase, Scissors, 
  Dumbbell, Waves, ShoppingBag, Trash2, History, 
  Plus, X, Check, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { CATEGORIES, PRICE_LEVELS, CONDITIONS } from '@/lib/constants';
import api from '@/lib/api';

// Icon mapping
const iconMap = {
  Shirt, Layers, Ruler, Briefcase, Scissors, Dumbbell, Waves
};

const getIcon = (iconName) => {
  return iconMap[iconName] || Shirt;
};

export default function MainPage() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dialogStep, setDialogStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [price, setPrice] = useState('');
  const [todayStats, setTodayStats] = useState({ total_purchases: 0, total_amount: 0, total_items: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  useEffect(() => {
    loadTodayStats();
  }, []);

  const loadTodayStats = async () => {
    try {
      const stats = await api.getTodayStats();
      setTodayStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const openCategoryDialog = (category) => {
    setSelectedCategory(category);
    setDialogStep(1);
    setSelectedLevel(null);
    setSelectedCondition(null);
    setPrice('');
  };

  const closeDialog = () => {
    setSelectedCategory(null);
    setDialogStep(1);
    setSelectedLevel(null);
    setSelectedCondition(null);
    setPrice('');
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setDialogStep(2);
  };

  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setDialogStep(3);
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
      price: priceValue,
    };

    setCart([...cart, newItem]);
    toast.success(`${selectedCategory.name} hinzugefügt`);
    closeDialog();
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Warenkorb ist leer');
      return;
    }

    setIsSubmitting(true);
    try {
      const items = cart.map(item => ({
        category: item.category,
        price_level: item.price_level,
        condition: item.condition,
        price: item.price,
      }));

      const purchase = await api.createPurchase(items);
      toast.success('Ankauf gespeichert!');
      setCart([]);
      loadTodayStats();
      setIsMobileCartOpen(false);
      
      // Open receipt in new tab with slight delay to ensure purchase is saved
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
                  <p className="font-medium text-sm">{item.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.price_level} • {item.condition}
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
        <Button 
          className="w-full h-14 text-lg touch-btn"
          disabled={cart.length === 0 || isSubmitting}
          onClick={handleCheckout}
          data-testid="checkout-btn"
        >
          {isSubmitting ? (
            'Speichern...'
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">ReWear POS</h1>
            <p className="text-sm text-muted-foreground">Ankaufs-System</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Today's stats */}
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

            <Link to="/history">
              <Button variant="outline" size="sm" data-testid="history-link">
                <History className="w-4 h-4 mr-2" />
                Historie
              </Button>
            </Link>

            {/* Mobile cart trigger */}
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
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="flex gap-8">
          {/* Categories grid */}
          <main className="flex-1">
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Kategorie wählen</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {CATEGORIES.map((category) => {
                const Icon = getIcon(category.icon);
                return (
                  <Card
                    key={category.id}
                    className="category-card p-4 cursor-pointer flex flex-col items-center justify-center min-h-[120px] hover:bg-accent/50"
                    onClick={() => openCategoryDialog(category)}
                    data-testid={`category-${category.id}`}
                  >
                    <Icon className="w-8 h-8 mb-2 text-primary" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-center">{category.name}</span>
                  </Card>
                );
              })}
            </div>
          </main>

          {/* Desktop cart sidebar */}
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
                {PRICE_LEVELS.map((level) => (
                  <Button
                    key={level.id}
                    variant="outline"
                    className={`w-full h-14 justify-start text-left level-btn ${level.color}`}
                    onClick={() => handleLevelSelect(level)}
                    data-testid={`level-${level.id}`}
                  >
                    <div>
                      <p className="font-semibold">{level.name}</p>
                      <p className="text-xs opacity-70">{level.description}</p>
                    </div>
                  </Button>
                ))}
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
                      className={`h-16 condition-badge ${condition.color}`}
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

            {/* Step 3: Price */}
            {dialogStep === 3 && (
              <div className="space-y-6 animate-slide-up">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedLevel?.name} • {selectedCondition?.name}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl text-muted-foreground">CHF</span>
                    <input
                      type="number"
                      className="price-input max-w-[200px]"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      autoFocus
                      min="0"
                      step="0.50"
                      data-testid="price-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5, 8, 10, 15, 20].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      className="h-12 font-display font-bold"
                      onClick={() => setPrice(val.toString())}
                      data-testid={`quick-price-${val}`}
                    >
                      {val}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12"
                    onClick={() => setDialogStep(2)}
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
