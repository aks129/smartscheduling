import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Bot,
  Send,
  User,
  Loader2,
  MapPin,
  Calendar,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  data?: any;
}

interface AgentChatProps {
  onProviderSelect?: (providerId: string) => void;
  onSlotSelect?: (slotId: string) => void;
  className?: string;
}

export function AgentChat({ onProviderSelect, onSlotSelect, className }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      content: "Hi! I'm the Smart Scheduling Agent. I can help you find healthcare providers, check availability, and get booking information. Try asking me something like:\n\n• \"Find a dermatologist in Boston\"\n• \"Search for cardiologists that accept Medicare\"\n• \"Show me Spanish-speaking providers near 02115\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/smart-scheduler/a2a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "message/send",
          params: {
            message: {
              parts: [{ type: "text", text: userMessage.content }],
            },
          },
          id: userMessage.id,
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      const taskSnapshot = result.result;
      const agentParts = taskSnapshot?.conversation?.[0]?.parts || [];
      const textPart = agentParts.find((p: any) => p.type === "text");
      const dataPart = agentParts.find((p: any) => p.type === "data");

      const agentMessage: Message = {
        id: generateId(),
        role: "agent",
        content: textPart?.text || "I processed your request.",
        timestamp: new Date(),
        data: dataPart?.data,
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: "agent",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleResultExpand = (id: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderProviderResults = (data: any, messageId: string) => {
    if (!data?.practitioners?.length) return null;

    const isExpanded = expandedResults.has(messageId);
    const providers = data.practitioners.slice(0, isExpanded ? undefined : 3);

    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs text-muted-foreground font-medium">
          {data.totalProviders} providers found • {data.totalSlots} available slots
        </div>
        {providers.map((provider: any, idx: number) => {
          const name = provider.practitioner?.display || "Unknown Provider";
          const specialty = provider.specialty?.[0]?.coding?.[0]?.display || "General";
          const locationRef = provider.location?.[0]?.display;

          return (
            <Card
              key={idx}
              className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onProviderSelect?.(provider.id)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-sm">{name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                    {locationRef && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {locationRef}
                      </span>
                    )}
                  </div>
                  {provider.insuranceAccepted?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.insuranceAccepted.slice(0, 3).map((ins: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ins.type || ins.name || "Insurance"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProviderSelect?.(provider.id);
                  }}
                >
                  View
                </Button>
              </div>
            </Card>
          );
        })}
        {data.practitioners.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => toggleResultExpand(messageId)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {data.practitioners.length - 3} more providers
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  const renderSlotResults = (data: any, messageId: string) => {
    if (!data?.slots?.length) return null;

    const isExpanded = expandedResults.has(messageId);
    const slots = data.slots.filter((s: any) => s.status === "free").slice(0, isExpanded ? undefined : 5);

    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs text-muted-foreground font-medium">
          {data.availableSlots} available slots
        </div>
        {slots.map((slot: any, idx: number) => {
          const startTime = new Date(slot.start);
          const formattedDate = startTime.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const formattedTime = startTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <Card
              key={idx}
              className="p-2 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSlotSelect?.(slot.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{formattedDate}</span>
                  <span className="text-sm text-muted-foreground">{formattedTime}</span>
                  {slot.appointmentType && (
                    <Badge variant="outline" className="text-xs">
                      {slot.appointmentType}
                    </Badge>
                  )}
                  {slot.isVirtual && (
                    <Badge variant="secondary" className="text-xs">
                      Virtual
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotSelect?.(slot.id);
                  }}
                >
                  Book
                </Button>
              </div>
            </Card>
          );
        })}
        {data.slots.filter((s: any) => s.status === "free").length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => toggleResultExpand(messageId)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show more slots
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  const renderBookingInfo = (data: any) => {
    if (!data?.bookingLink && !data?.bookingPhone) return null;

    return (
      <div className="mt-3 space-y-2">
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="space-y-2">
            <div className="text-sm font-medium">Booking Information</div>
            {data.bookingLink && (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => window.open(data.bookingLink, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Book Online
              </Button>
            )}
            {data.bookingPhone && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`tel:${data.bookingPhone}`, "_self")}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call {data.bookingPhone}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderMessageData = (message: Message) => {
    if (!message.data) return null;

    // Provider search results
    if (message.data.practitioners) {
      return renderProviderResults(message.data, message.id);
    }

    // Availability/slots results
    if (message.data.slots) {
      return renderSlotResults(message.data, message.id);
    }

    // Booking info
    if (message.data.bookingLink || message.data.bookingPhone) {
      return renderBookingInfo(message.data);
    }

    return null;
  };

  return (
    <Card className={cn("flex flex-col", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span>Smart Scheduling Agent</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    A2A
                  </Badge>
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {messages.length - 1} messages
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-lg p-3 max-w-[85%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {renderMessageData(message)}
                      <div
                        className={cn(
                          "text-xs mt-2 opacity-70",
                          message.role === "user" ? "text-right" : "text-left"
                        )}
                      >
                        {message.timestamp.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg p-3 bg-muted">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4">
              <Input
                ref={inputRef}
                placeholder="Ask about providers, availability, or booking..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {[
                "Find dermatologists in Boston",
                "Spanish-speaking doctors",
                "Accepts Medicare",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  disabled={isLoading}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
