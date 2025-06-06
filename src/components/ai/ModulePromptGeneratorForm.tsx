"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FileText } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateModulePrompt, type ModulePromptInput, type ModulePromptOutput } from "@/ai/flows/module-prompt-generator";

const ModulePromptGeneratorSchema = z.object({
  moduleDescription: z.string().min(20, "Module description must be at least 20 characters long.").max(1000),
});

type ModulePromptGeneratorFormValues = z.infer<typeof ModulePromptGeneratorSchema>;

export default function ModulePromptGeneratorForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ModulePromptOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<ModulePromptGeneratorFormValues>({
    resolver: zodResolver(ModulePromptGeneratorSchema),
    defaultValues: {
      moduleDescription: "",
    },
  });

  const onSubmit: SubmitHandler<ModulePromptGeneratorFormValues> = async (data) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await generateModulePrompt(data);
      setResult(response);
      toast({
        title: "Prompt Generated",
        description: "AI module prompt has been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating module prompt:", error);
      toast({
        title: "Error",
        description: "Failed to generate module prompt. Please try again.",
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
          <FileText className="h-6 w-6 text-primary" />
          AI Module Prompt Generator
        </CardTitle>
        <CardDescription>
          Generate a detailed development prompt for a new module based on its description.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="moduleDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A module to manage customer invoices, allowing creation, viewing, and sending of PDF invoices."
                      {...field}
                      className="min-h-[150px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of the module you want to build.
                  </FormDescription>
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
                "Generate Prompt"
              )}
            </Button>
          </form>
        </Form>

        {result && (
          <div className="mt-8 space-y-4 rounded-lg border bg-secondary/50 p-6 shadow-inner">
            <h3 className="font-headline text-lg font-semibold text-primary">Generated Module Prompt:</h3>
            <Textarea
              readOnly
              value={result.modulePrompt}
              className="min-h-[200px] text-sm bg-background"
              aria-label="Generated module prompt"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
