"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getContentSuggestions, type ContentSuggestionsInput, type ContentSuggestionsOutput } from "@/ai/flows/ai-content-suggestions";

const AISuggestionFormSchema = z.object({
  modulePurpose: z.string().min(10, "Module purpose must be at least 10 characters long.").max(500),
  moduleContext: z.string().min(10, "Module context must be at least 10 characters long.").max(500),
  desiredContentLength: z.enum(["Short", "Medium", "Long"]),
});

type AISuggestionFormValues = z.infer<typeof AISuggestionFormSchema>;

export default function AISuggestionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ContentSuggestionsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AISuggestionFormValues>({
    resolver: zodResolver(AISuggestionFormSchema),
    defaultValues: {
      modulePurpose: "",
      moduleContext: "Business Maestro application",
      desiredContentLength: "Medium",
    },
  });

  const onSubmit: SubmitHandler<AISuggestionFormValues> = async (data) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await getContentSuggestions(data);
      setResult(response);
      toast({
        title: "Suggestions Generated",
        description: "AI content suggestions have been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Lightbulb className="h-6 w-6 text-primary" />
          AI Content Suggestions
        </CardTitle>
        <CardDescription>
          Generate content ideas for your module using AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="modulePurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Purpose</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., User profile page, Sales dashboard, Settings panel"
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Describe the main goal or function of this module.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="moduleContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Context</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Business Maestro application for small business owners"
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide context like application name, target audience, data domain.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="desiredContentLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Content Length</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content length" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Short">Short (a few sentences)</SelectItem>
                      <SelectItem value="Medium">Medium (a paragraph)</SelectItem>
                      <SelectItem value="Long">Long (several paragraphs)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Get Suggestions"
              )}
            </Button>
          </form>
        </Form>

        {result && (
          <div className="mt-8 space-y-4 rounded-lg border bg-secondary/50 p-6 shadow-inner">
            <h3 className="font-headline text-lg font-semibold text-primary">Generated Suggestions:</h3>
            {result.suggestions.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm">{suggestion}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No suggestions generated.</p>
            )}
            <h4 className="font-headline text-md font-semibold pt-2">Reasoning:</h4>
            <p className="text-sm text-muted-foreground">{result.reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
