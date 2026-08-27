import { useState, useEffect } from "react";
import { Facebook, Instagram, Twitter, Mail, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SocialIconsProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
}

const SocialIcons = ({ size = "md", variant = "outline" }: SocialIconsProps) => {
  const [socialLinks, setSocialLinks] = useState([
    {
      name: "Instagram",
      icon: Instagram,
      href: "https://www.instagram.com/rahulguptaig",
      color: "hover:text-pink-500"
    },
    {
      name: "YouTube",
      icon: Youtube,
      href: "https://m.youtube.com/channel/UC68B_U0nsb3kRmBvmJpTKFA",
      color: "hover:text-red-600"
    },
    {
      name: "Facebook", 
      icon: Facebook,
      href: "https://www.facebook.com/RahulGuptaig/",
      color: "hover:text-blue-600"
    },
    {
      name: "Twitter",
      icon: Twitter,
      href: "https://x.com/RahulGuptaIG",
      color: "hover:text-blue-400"
    },
    {
      name: "Email",
      icon: Mail,
      href: "mailto:contact@rahulgupta.site",
      color: "hover:text-red-500"
    }
  ]);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  };

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    const { data } = await supabase.rpc('get_public_site_settings');

    if (data) {
      const social = (data as Array<{ key: string; value: string; category: string }>).filter(d => d.category === 'social');
      setSocialLinks(prev => prev.map(link => {
        const settingKey = `social_${link.name.toLowerCase()}`;
        const setting = social.find(d => d.key === settingKey);
        return setting ? { ...link, href: setting.value } : link;
      }));
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {socialLinks.map((social) => {
        const Icon = social.icon;
        return (
          <Button
            key={social.name}
            variant={variant}
            size="icon"
            className={`${sizeClasses[size]} transition-all duration-300 ${social.color} hover:scale-110 shadow-soft`}
            asChild
          >
            <a 
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow on ${social.name}`}
            >
              <Icon size={iconSize[size]} />
            </a>
          </Button>
        );
      })}
    </div>
  );
};

export default SocialIcons;