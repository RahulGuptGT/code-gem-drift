import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import SocialIcons from "@/components/SocialIcons";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { UniversalSpinner } from "@/components/ui/UniversalLoader";
import { useScrollToHash } from "@/hooks/useScrollToHash";

// Input validation schema
const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  message: z.string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters")
});

const Contact = () => {
  useScrollToHash();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    email: "rahul@rahulgupta.online",
    whatsapp: "+919153525343",
    location: "Bihar, India"
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContactSettings();
  }, []);

  const fetchContactSettings = async () => {
    const { data } = await supabase.rpc('get_public_site_settings');

    if (data) {
      const settings = (data as Array<{ key: string; value: string }>).reduce((acc, item) => {
        if (item.key === 'contact_email') acc.email = item.value;
        if (item.key === 'contact_whatsapp') acc.whatsapp = item.value;
        if (item.key === 'contact_location') acc.location = item.value;
        return acc;
      }, { email: "", whatsapp: "", location: "" });
      setContactInfo(settings);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate input
      const validated = contactSchema.parse(formData);

      const { error } = await supabase
        .from('contact_submissions')
        .insert([{
          name: validated.name,
          email: validated.email,
          message: validated.message
        }]);

      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "Thank you for reaching out. I'll get back to you soon!",
      });
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      value: contactInfo.email,
      href: `mailto:${contactInfo.email}`,
      description: "Send me an email anytime"
    },
    {
      icon: Phone,
      title: "WhatsApp",
      value: contactInfo.whatsapp,
      href: `https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`,
      description: "Message me on WhatsApp"
    },
    {
      icon: MapPin,
      title: "Location",
      value: contactInfo.location,
      href: "#",
      description: "Proud to be from Bihar"
    }
  ];

  return (
    <div className="min-h-screen py-16">
      <div className="section-container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div id="header" className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold text-midnight-blue mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions, suggestions, or just want to say hello? I'd love to hear from you!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div id="form" className="card-modern">
              <h2 className="text-2xl font-semibold text-midnight-blue mb-6">
                Send me a message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-foreground">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                    className="mt-2"
                  />
                </div>

                <div id="email">
                  <Label htmlFor="email-input" className="text-foreground">Email *</Label>
                  <Input
                    id="email-input"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-foreground">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Your message..."
                    rows={6}
                    className="mt-2"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-hero"
                >
                  {isSubmitting ? (
                    <>
                      <UniversalSpinner size={16} className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Contact Methods */}
              <div id="methods" className="space-y-6">
                {contactMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.title} id={method.title.toLowerCase()} className="card-modern group hover:scale-105 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-electric-blue/10 text-electric-blue">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-midnight-blue">
                            {method.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {method.description}
                          </p>
                          {method.href !== "#" ? (
                            <a
                              href={method.href}
                              className="text-electric-blue font-medium hover:underline"
                              target={method.href.startsWith("http") ? "_blank" : "_self"}
                              rel={method.href.startsWith("http") ? "noopener noreferrer" : ""}
                            >
                              {method.value}
                            </a>
                          ) : (
                            <span className="text-foreground font-medium">
                              {method.value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Social Media */}
              <div id="social" className="card-modern text-center">
                <h3 className="text-xl font-semibold text-midnight-blue mb-4">
                  Follow me on social media
                </h3>
                <p className="text-muted-foreground mb-6">
                  Stay updated with my journey and connect with me on various platforms
                </p>
                <SocialIcons size="lg" />
              </div>

              {/* Why Contact Me */}
              <div id="reasons" className="card-modern bg-gradient-to-br from-electric-blue/5 to-midnight-blue/5">
                <h3 className="text-xl font-semibold text-midnight-blue mb-4">
                  Why reach out?
                </h3>
                <div className="space-y-3">
                  {[
                    "Questions about my study resources",
                    "Collaboration opportunities",
                    "Feedback on the website",
                    "General student queries",
                    "Technical discussions"
                  ].map((reason) => (
                    <div key={reason} className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-electric-blue flex-shrink-0" />
                      <span className="text-muted-foreground">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Time */}
              <div id="response" className="card-modern bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <h4 className="font-medium text-green-800">Quick Response</h4>
                    <p className="text-sm text-green-600">
                      I typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div id="cta" className="mt-16 text-center">
            <div className="card-modern bg-gradient-to-r from-electric-blue to-midnight-blue text-white">
              <h3 className="text-2xl font-bold mb-4">
                Let's Build Something Amazing Together!
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Whether you're a fellow student, educator, or just someone who shares my passion for learning, 
                I'd love to connect and explore how we can collaborate.
              </p>
              <Button 
                variant="secondary"
                className="bg-white text-midnight-blue hover:bg-gray-100"
                asChild
              >
                <a href="/about">Learn More About My Mission</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
