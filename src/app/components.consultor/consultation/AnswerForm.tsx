
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Send, Zap } from "lucide-react"; // Zap não é mais usado, mas mantido para não quebrar outras referências

const AnswerFormSchema = z.object({
  answer: z.string().min(1, "Sua resposta não pode estar vazia.").max(2000, "Sua resposta é muito longa."),
});

type AnswerFormData = z.infer<typeof AnswerFormSchema>;

interface AnswerFormProps {
  onSubmit: (answer: string) => void;
  isLoading: boolean;
  questionId: string; // Used to reset form when question changes
}

export function AnswerForm({ onSubmit, isLoading, questionId }: AnswerFormProps) {
  const form = useForm<AnswerFormData>({
    resolver: zodResolver(AnswerFormSchema),
    defaultValues: {
      answer: "",
    },
  });

  React.useEffect(() => {
    form.reset({ answer: "" }); // Reset form when question changes
  }, [questionId, form]);

  const handleFormSubmit = (data: AnswerFormData) => {
    onSubmit(data.answer);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="mt-6 w-full max-w-2xl space-y-4">
        <FormField
          control={form.control}
          name="answer"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Digite sua resposta aqui..."
                  className="min-h-[100px] resize-none rounded-lg border-2 border-input bg-background p-4 text-base shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  {...field}
                  disabled={isLoading}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-grow rounded-lg px-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-shadow"
            size="lg"
          >
            <Send className="mr-2 h-5 w-5" />
            Responder
          </Button>
        </div>
      </form>
    </Form>
  );
}
