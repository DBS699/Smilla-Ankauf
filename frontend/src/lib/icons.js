import {
    Shirt, Layers, Ruler, Briefcase, Scissors, Dumbbell, Waves, ShoppingBag,
    Tag, Gift, Crown, Star, Heart, Sparkles, Gem, Sun, Moon,
    Umbrella, CloudRain, Snowflake, Ghost, Coffee, Watch, Glasses,
    Backpack, Palette, Trophy, Flame, Smile, MoveVertical,
    Laptop, Smartphone, Headphones, Bike, Car, Home, Key, Book, Music,
    Baby, Dog, Cat, Plane, Hammer, Wrench, Utensils,
    Trash2, History, Plus, X, Check, Settings, Zap, HelpCircle, ExternalLink, LogOut, User,
    Image, Camera, Eye, EyeOff, RotateCcw, FileText, Type, Shield, Download, Upload, CheckCircle, AlertCircle,
    FileSpreadsheet, ArrowLeft
} from 'lucide-react';

// Import specific clothing icons from Game Icons
import {
    GiPoloShirt, GiHoodie, GiLabCoat, GiCoat, GiKimono, GiDress,
    GiSkirt, GiShorts, GiTrousers, GiUnderwear, GiWinterGloves,
    GiWinterHat, GiRunningShoe, GiConverseShoe, GiHighHeel, GiBoots,
    GiZipper, GiBelt, GiNecklace, GiEarrings, GiSpectacles, GiHandBag,
    GiBackpack, GiSchoolBag, GiTopHat, GiBowTie, GiRolledCloth, GiClothesline,
    GiHanger, GiSewingNeedle, GiThread, GiButtons, GiSonicShoes
} from 'react-icons/gi';

// Combined Icon Map
export const iconMap = {
    // --- Lucide Icons (Base Set) ---
    Shirt, Layers, Ruler, Briefcase, Scissors, Dumbbell, Waves, ShoppingBag,
    Tag, Gift, Crown, Star, Heart, Sparkles, Gem, Sun, Moon,
    Umbrella, CloudRain, Snowflake, Ghost, Coffee, Watch, Glasses,
    Backpack, Palette, Trophy, Flame, Smile, MoveVertical,
    Laptop, Smartphone, Headphones, Bike, Car, Home, Key, Book, Music,
    Baby, Dog, Cat, Plane, Hammer, Wrench, Utensils,
    Trash2, History, Plus, X, Check, Settings, Zap, HelpCircle, ExternalLink, LogOut, User,
    Image, Camera, Eye, EyeOff, RotateCcw, FileText, Type, Shield, Download, Upload, CheckCircle, AlertCircle,
    FileSpreadsheet, ArrowLeft,

    // --- Game Icons (Specific Clothing) ---
    'Polo': GiPoloShirt,
    'Hoodie': GiHoodie,
    'Jacket': GiLabCoat, // Closest generic jacket
    'Coat': GiCoat,
    'Kimono': GiKimono,
    'Dress': GiDress,
    'Skirt': GiSkirt,
    'Shorts': GiShorts,
    'Trousers': GiTrousers,
    'Underwear': GiUnderwear,
    'Gloves': GiWinterGloves,
    'Hat': GiWinterHat,
    'Sneakers': GiRunningShoe,
    'Shoes': GiConverseShoe,
    'Heels': GiHighHeel,
    'Boots': GiBoots,
    'Zipper': GiZipper,
    'Belt': GiBelt,
    'Necklace': GiNecklace,
    'Earrings': GiEarrings,
    'GlassesAlt': GiSpectacles,
    'Handbag': GiHandBag,
    'SchoolBag': GiSchoolBag,
    'TopHat': GiTopHat,
    'BowTie': GiBowTie,
    'Cloth': GiRolledCloth,
    'Hanger': GiHanger,
    'Needle': GiSewingNeedle,
    'Thread': GiThread,
    'Buttons': GiButtons,
    'Vintage': GiSonicShoes,

    // Aliases for compatibility
    'Jeans': GiTrousers, // Better than Zap
    'Sweatshirt': GiHoodie
};

export const getIcon = (iconName) => {
    return iconMap[iconName] || iconMap['Shirt'];
};
